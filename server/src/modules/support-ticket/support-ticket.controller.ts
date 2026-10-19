import { Request, Response } from "express";
import { SupportTicketService } from "./support-ticket.service";

export class SupportTicketController {
  // Tenant: POST /api/tenant/support-tickets
  static async createTenantTicket(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const userId = (req as any).user?.id;
      const branchId = (req.headers["x-branch-id"] as string) || (req as any).user?.branchId;

      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context missing" });
        return;
      }

      const ticket = await SupportTicketService.createTicket(tenantId, userId, {
        ...req.body,
        branchId,
      });

      res.status(201).json({
        success: true,
        message: "Support ticket created successfully",
        data: { ticket },
      });
    } catch (error: any) {
      console.error("[SupportTicketController.createTenantTicket]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create support ticket",
      });
    }
  }

  // Tenant: GET /api/tenant/support-tickets
  static async listTenantTickets(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context missing" });
        return;
      }

      const { search, status, category, priority } = req.query;
      const result = await SupportTicketService.listTenantTickets(tenantId, {
        search: search as string,
        status: status as string,
        category: category as string,
        priority: priority as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[SupportTicketController.listTenantTickets]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to list support tickets",
      });
    }
  }

  // Tenant: GET /api/tenant/support-tickets/:id
  static async getTenantTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ticket ID" });
        return;
      }

      const result = await SupportTicketService.getTicketDetails(id, "TENANT");
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[SupportTicketController.getTenantTicketDetails]", error);
      res.status(404).json({
        success: false,
        message: error.message || "Ticket not found",
      });
    }
  }

  // Tenant: POST /api/tenant/support-tickets/:id/replies
  static async addTenantReply(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.id;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ticket ID" });
        return;
      }

      const reply = await SupportTicketService.addReply(
        id,
        userId,
        "TENANT_USER",
        req.body
      );

      res.status(201).json({
        success: true,
        message: "Reply sent successfully",
        data: { reply },
      });
    } catch (error: any) {
      console.error("[SupportTicketController.addTenantReply]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send reply",
      });
    }
  }

  // Super Admin: GET /api/super-admin/support-tickets
  static async listAdminTickets(req: Request, res: Response): Promise<void> {
    try {
      const { search, business_id, status, category, priority } = req.query;
      const result = await SupportTicketService.listAdminTickets({
        search: search as string,
        business_id: business_id as string,
        status: status as string,
        category: category as string,
        priority: priority as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[SupportTicketController.listAdminTickets]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to list support tickets",
      });
    }
  }

  // Super Admin: GET /api/super-admin/support-tickets/:id
  static async getAdminTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ticket ID" });
        return;
      }

      const result = await SupportTicketService.getTicketDetails(id, "SUPER_ADMIN");
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[SupportTicketController.getAdminTicketDetails]", error);
      res.status(404).json({
        success: false,
        message: error.message || "Ticket not found",
      });
    }
  }

  // Super Admin: POST /api/super-admin/support-tickets/:id/replies
  static async addAdminReply(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = (req as any).user?.id || "admin";

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ticket ID" });
        return;
      }

      const reply = await SupportTicketService.addReply(
        id,
        userId,
        "SUPER_ADMIN",
        req.body
      );

      res.status(201).json({
        success: true,
        message: "Admin reply sent successfully",
        data: { reply },
      });
    } catch (error: any) {
      console.error("[SupportTicketController.addAdminReply]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send admin reply",
      });
    }
  }

  // Super Admin / Tenant: PATCH /api/super-admin/support-tickets/:id
  static async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { status } = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ticket ID" });
        return;
      }

      const ticket = await SupportTicketService.updateStatus(id, status);
      res.status(200).json({
        success: true,
        message: `Ticket status updated to ${status}`,
        data: { ticket },
      });
    } catch (error: any) {
      console.error("[SupportTicketController.updateTicketStatus]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update ticket status",
      });
    }
  }
}
