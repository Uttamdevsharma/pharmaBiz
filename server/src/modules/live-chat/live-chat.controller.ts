import { Request, Response } from "express";
import { LiveChatService } from "./live-chat.service";

export class LiveChatController {
  // Visitor: POST /api/live-chat/session
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, department, question } = req.body;
      const current_url = req.body.current_url || req.headers.referer;
      const user_agent = req.body.user_agent || req.headers["user-agent"];

      const result = await LiveChatService.createSession({
        name,
        email,
        phone,
        department,
        question,
        current_url,
        user_agent,
      });

      res.status(201).json({
        success: true,
        message: "Chat session initialized successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("[LiveChatController.createSession]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create chat session",
      });
    }
  }

  // Visitor: GET /api/live-chat/session?sessionToken=...
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionToken = req.query.sessionToken as string;
      if (!sessionToken) {
        res.status(400).json({
          success: false,
          message: "sessionToken query parameter is required",
        });
        return;
      }

      const result = await LiveChatService.getSessionByToken(sessionToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[LiveChatController.getSession]", error);
      res.status(404).json({
        success: false,
        message: error.message || "Session not found",
      });
    }
  }

  // Visitor: GET /api/live-chat/messages?sessionToken=...&afterId=...
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const sessionToken = req.query.sessionToken as string;
      const afterId = req.query.afterId ? parseInt(req.query.afterId as string, 10) : undefined;

      if (!sessionToken) {
        res.status(400).json({
          success: false,
          message: "sessionToken query parameter is required",
        });
        return;
      }

      const result = await LiveChatService.getMessagesAfter(sessionToken, afterId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch messages",
      });
    }
  }

  // Visitor: POST /api/live-chat/messages
  static async sendVisitorMessage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken, message } = req.body;
      const result = await LiveChatService.sendVisitorMessage({
        sessionToken,
        message,
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: { message: result },
      });
    } catch (error: any) {
      console.error("[LiveChatController.sendVisitorMessage]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send message",
      });
    }
  }

  // Super Admin: GET /api/super-admin/live-chat/sessions
  static async listAdminSessions(req: Request, res: Response): Promise<void> {
    try {
      const { search, department, status } = req.query;
      const result = await LiveChatService.listAdminSessions({
        search: search as string,
        department: department as string,
        status: status as string,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[LiveChatController.listAdminSessions]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve chat sessions",
      });
    }
  }

  // Super Admin: GET /api/super-admin/live-chat/sessions/:id
  static async getAdminSessionDetails(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          message: "Invalid session id",
        });
        return;
      }

      const result = await LiveChatService.getAdminSessionDetails(sessionId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[LiveChatController.getAdminSessionDetails]", error);
      res.status(404).json({
        success: false,
        message: error.message || "Chat session not found",
      });
    }
  }

  // Super Admin: POST /api/super-admin/live-chat/sessions/:id
  static async sendAdminReply(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = parseInt(req.params.id as string, 10);
      const { message } = req.body;
      const senderName = (req.user as any)?.name || (req.user as any)?.email?.split("@")[0] || "Super Admin";

      if (isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          message: "Invalid session id",
        });
        return;
      }

      const result = await LiveChatService.sendAdminReply(sessionId, senderName, message);
      res.status(201).json({
        success: true,
        message: "Reply sent successfully",
        data: { message: result },
      });
    } catch (error: any) {
      console.error("[LiveChatController.sendAdminReply]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send agent reply",
      });
    }
  }

  // Super Admin: PATCH /api/super-admin/live-chat/sessions/:id
  static async updateSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = parseInt(req.params.id as string, 10);
      const { status } = req.body;
      const agentName = (req.user as any)?.name || "Support Specialist";

      if (isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          message: "Invalid session id",
        });
        return;
      }

      const result = await LiveChatService.updateSessionStatus(sessionId, status, agentName);
      res.status(200).json({
        success: true,
        message: `Chat session status updated to ${status}`,
        data: { session: result },
      });
    } catch (error: any) {
      console.error("[LiveChatController.updateSessionStatus]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update session status",
      });
    }
  }
}
