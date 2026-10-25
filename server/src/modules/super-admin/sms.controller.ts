import { Request, Response } from "express";
import { SmsService } from "./sms.service";

export class SmsController {
  /**
   * GET /api/super-admin/sms/settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SmsService.getSettings();
      return res.json({
        success: true,
        data: settings,
      });
    } catch (err: any) {
      console.error("Failed to get SMS settings:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to retrieve SMS settings",
      });
    }
  }

  /**
   * PUT /api/super-admin/sms/settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const updated = await SmsService.updateSettings(req.body);
      return res.json({
        success: true,
        message: "SMS Gateway settings updated successfully",
        data: updated,
      });
    } catch (err: any) {
      console.error("Failed to update SMS settings:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to update SMS settings",
      });
    }
  }

  /**
   * GET /api/super-admin/sms/recipients or /api/super-admin/sms/send/recipients
   */
  static async getRecipients(req: Request, res: Response) {
    try {
      const filter = (req.query.filter as any) || "ALL";
      const recipients = await SmsService.getRecipients(filter);
      return res.json({
        success: true,
        data: recipients,
      });
    } catch (err: any) {
      console.error("Failed to get SMS recipients:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to load recipient pharmacies",
      });
    }
  }

  /**
   * POST /api/super-admin/sms/campaign or /api/super-admin/sms/send/campaign
   */
  static async sendCampaign(req: Request, res: Response) {
    try {
      const { channel, subject, message, recipientIds } = req.body;
      const origin = req.headers.origin || `${req.protocol}://${req.get("host")}`;

      const result = await SmsService.sendCampaign({
        channel: channel || "SMS",
        subject,
        message,
        recipientIds: Array.isArray(recipientIds) ? recipientIds.map(String) : [],
        origin: typeof origin === "string" ? origin : undefined,
      });

      return res.json(result);
    } catch (err: any) {
      console.error("Failed to send campaign:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to send SMS campaign",
      });
    }
  }

  /**
   * GET /api/super-admin/sms/logs
   */
  static async getLogs(req: Request, res: Response) {
    try {
      const result = await SmsService.getLogs(req.query);
      return res.json(result);
    } catch (err: any) {
      console.error("Failed to get SMS logs:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to retrieve SMS logs",
      });
    }
  }
}
