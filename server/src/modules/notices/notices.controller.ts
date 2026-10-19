import { Request, Response } from "express";
import { NoticesService } from "./notices.service";

export class NoticesController {
  // --- Super Admin Actions ---

  static async superAdminList(req: Request, res: Response) {
    try {
      const result = await NoticesService.superAdminListNotices({
        search: req.query.search as string,
        type: req.query.type as string,
        is_published: req.query.is_published as string,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[SuperAdminListNotices Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch notices",
      });
    }
  }

  static async superAdminCreate(req: Request, res: Response) {
    try {
      const notice = await NoticesService.superAdminCreateNotice(req.body);
      return res.status(201).json({
        success: true,
        data: notice,
        message: "Notice published successfully",
      });
    } catch (error: any) {
      console.error("[SuperAdminCreateNotice Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create notice",
      });
    }
  }

  static async superAdminUpdate(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid notice ID" });
      }

      const notice = await NoticesService.superAdminUpdateNotice(id, req.body);
      return res.json({
        success: true,
        data: notice,
        message: "Notice updated successfully",
      });
    } catch (error: any) {
      console.error("[SuperAdminUpdateNotice Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update notice",
      });
    }
  }

  static async superAdminDelete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid notice ID" });
      }

      const result = await NoticesService.superAdminDeleteNotice(id);
      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[SuperAdminDeleteNotice Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete notice",
      });
    }
  }

  static async superAdminGetEligibleBusinesses(req: Request, res: Response) {
    try {
      const businesses = await NoticesService.getEligibleBusinesses();
      return res.json({
        success: true,
        data: businesses,
      });
    } catch (error: any) {
      console.error("[GetEligibleBusinesses Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get businesses",
      });
    }
  }

  // --- Tenant Actions ---

  static async tenantList(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: "Tenant context missing" });
      }

      const result = await NoticesService.tenantListNotices(tenantId, {
        search: req.query.search as string,
        type: req.query.type as string,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[TenantListNotices Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch tenant notices",
      });
    }
  }

  static async tenantMarkRead(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const userId = (req as any).user?.id;
      const noticeId = req.body.notice_id;

      if (!tenantId || !noticeId) {
        return res.status(400).json({ success: false, message: "Tenant context and notice_id are required" });
      }

      const read = await NoticesService.tenantMarkRead(noticeId, tenantId, userId);
      return res.json({
        success: true,
        data: read,
      });
    } catch (error: any) {
      console.error("[TenantMarkRead Error]", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to mark notice as read",
      });
    }
  }
}
