import { Request, Response } from "express";
import { TenantService } from "./tenant.service";

export class TenantController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const profile = await TenantService.getProfile(tenantId);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const updated = await TenantService.updateProfile(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Company profile updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const subInfo = await TenantService.getSubscriptionAndLimits(tenantId);
      res.status(200).json({ success: true, data: subInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const subInfo = await TenantService.getSubscriptionAndLimits(tenantId);
      res.status(200).json({
        success: true,
        data: {
          usage: subInfo.usage,
          features: subInfo.features,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
