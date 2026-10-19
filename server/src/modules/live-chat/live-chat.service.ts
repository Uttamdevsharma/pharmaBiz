import { randomUUID } from "crypto";
import { prisma } from "../../app/lib/prisma";
import {
  CreateChatSessionInput,
  SendVisitorMessageInput,
  AdminSendMessageInput,
  UpdateSessionStatusInput,
} from "./live-chat.types";

export class LiveChatService {
  /**
   * Helper to format department name for greetings
   */
  private static formatDept(dept: string): string {
    switch (dept) {
      case "TECH_SUPPORT":
        return "TECH SUPPORT";
      case "SALES":
        return "SALES";
      case "BILLING":
        return "BILLING";
      default:
        return "GENERAL";
    }
  }

  /**
   * 1. Create a new visitor chat session
   */
  static async createSession(data: CreateChatSessionInput) {
    const sessionToken = `chat_${randomUUID()}`;
    const deptLabel = this.formatDept(data.department);

    // Create session record
    const session = await (prisma as any).live_chat_sessions.create({
      data: {
        session_token: sessionToken,
        visitor_name: data.name,
        visitor_email: data.email,
        visitor_phone: data.phone,
        department: data.department || "GENERAL",
        status: "WAITING",
        current_url: data.current_url || null,
        user_agent: data.user_agent || null,
        last_message_at: new Date(),
      },
    });

    // 1st message: Visitor's initial inquiry
    const visitorMsg = await (prisma as any).live_chat_messages.create({
      data: {
        session_id: session.id,
        sender_type: "VISITOR",
        sender_name: data.name,
        message: data.question,
        is_read: false,
      },
    });

    // 2nd message: Automated system welcome greeting
    const systemGreeting = await (prisma as any).live_chat_messages.create({
      data: {
        session_id: session.id,
        sender_type: "SYSTEM",
        sender_name: "System",
        message: `Hello ${data.name}! Thank you for contacting our ${deptLabel} team. A pharmacy software specialist has been notified and will reply shortly.`,
        is_read: true,
      },
    });

    return {
      session,
      messages: [visitorMsg, systemGreeting],
    };
  }

  /**
   * 2. Get session details and all conversation messages by sessionToken
   */
  static async getSessionByToken(sessionToken: string) {
    const session = await (prisma as any).live_chat_sessions.findUnique({
      where: { session_token: sessionToken },
    });

    if (!session) {
      throw new Error("Chat session not found");
    }

    const messages = await (prisma as any).live_chat_messages.findMany({
      where: { session_id: session.id },
      orderBy: { created_at: "asc" },
    });

    return { session, messages };
  }

  /**
   * 3. Fetch newly arrived messages (lightweight visitor polling)
   */
  static async getMessagesAfter(sessionToken: string, afterId?: number) {
    const session = await (prisma as any).live_chat_sessions.findUnique({
      where: { session_token: sessionToken },
      select: { id: true, status: true },
    });

    if (!session) {
      throw new Error("Chat session not found");
    }

    const whereClause: any = { session_id: session.id };
    if (afterId && !isNaN(afterId)) {
      whereClause.id = { gt: afterId };
    }

    const messages = await (prisma as any).live_chat_messages.findMany({
      where: whereClause,
      orderBy: { created_at: "asc" },
    });

    return { messages, status: session.status };
  }

  /**
   * 4. Visitor sends a new message
   */
  static async sendVisitorMessage(data: SendVisitorMessageInput) {
    const session = await (prisma as any).live_chat_sessions.findUnique({
      where: { session_token: data.sessionToken },
    });

    if (!session) {
      throw new Error("Chat session not found");
    }

    const message = await (prisma as any).live_chat_messages.create({
      data: {
        session_id: session.id,
        sender_type: "VISITOR",
        sender_name: session.visitor_name,
        message: data.message,
        is_read: false,
      },
    });

    // Update last message timestamp and if session was marked resolved, revive to WAITING
    const newStatus = session.status === "RESOLVED" || session.status === "CLOSED" ? "WAITING" : session.status;
    await (prisma as any).live_chat_sessions.update({
      where: { id: session.id },
      data: {
        last_message_at: new Date(),
        status: newStatus,
      },
    });

    return message;
  }

  /**
   * 5. Super Admin: List all sessions with filters and counts
   */
  static async listAdminSessions(query: {
    search?: string;
    department?: string;
    status?: string;
  }) {
    const { search, department, status } = query;

    const where: any = {};

    if (department && department !== "ALL" && department !== "All Depts") {
      where.department = department;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { visitor_name: { contains: q, mode: "insensitive" } },
        { visitor_email: { contains: q, mode: "insensitive" } },
        { visitor_phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const sessions = await (prisma as any).live_chat_sessions.findMany({
      where,
      orderBy: { last_message_at: "desc" },
      include: {
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    // Compute unread counts for each session
    const sessionIds = sessions.map((s: any) => s.id);
    let unreadMap: Record<number, number> = {};

    if (sessionIds.length > 0) {
      const unreadGroup = await (prisma as any).live_chat_messages.groupBy({
        by: ["session_id"],
        where: {
          session_id: { in: sessionIds },
          sender_type: "VISITOR",
          is_read: false,
        },
        _count: { id: true },
      });

      unreadGroup.forEach((g: any) => {
        unreadMap[g.session_id] = g._count.id;
      });
    }

    const mappedSessions = sessions.map((s: any) => ({
      ...s,
      unread_count: unreadMap[s.id] || 0,
      last_message: s.messages && s.messages[0] ? s.messages[0] : null,
      messages: undefined,
    }));

    // Metric summary counts
    const totalChats = await (prisma as any).live_chat_sessions.count();
    const waitingChats = await (prisma as any).live_chat_sessions.count({
      where: { status: "WAITING" },
    });
    const totalUnreadMessages = await (prisma as any).live_chat_messages.count({
      where: {
        sender_type: "VISITOR",
        is_read: false,
      },
    });

    return {
      sessions: mappedSessions,
      metrics: {
        totalChats,
        waitingChats,
        unreadTotal: totalUnreadMessages,
      },
    };
  }

  /**
   * 6. Super Admin: Get single session conversation and mark visitor messages as read
   */
  static async getAdminSessionDetails(sessionId: number) {
    const session = await (prisma as any).live_chat_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Chat session not found");
    }

    // Mark all unread visitor messages in this session as read
    await (prisma as any).live_chat_messages.updateMany({
      where: {
        session_id: sessionId,
        sender_type: "VISITOR",
        is_read: false,
      },
      data: { is_read: true },
    });

    // Fetch full message stream
    const messages = await (prisma as any).live_chat_messages.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
    });

    return { session, messages };
  }

  /**
   * 7. Super Admin: Send agent reply
   */
  static async sendAdminReply(sessionId: number, senderName: string, messageText: string) {
    const session = await (prisma as any).live_chat_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Chat session not found");
    }

    const message = await (prisma as any).live_chat_messages.create({
      data: {
        session_id: sessionId,
        sender_type: "AGENT",
        sender_name: senderName || "Super Admin",
        message: messageText,
        is_read: true,
      },
    });

    // Update session last_message_at and set status to ACTIVE
    await (prisma as any).live_chat_sessions.update({
      where: { id: sessionId },
      data: {
        last_message_at: new Date(),
        status: "ACTIVE",
      },
    });

    return message;
  }

  /**
   * 8. Super Admin: Update session status (ACTIVE, RESOLVED, CLOSED)
   */
  static async updateSessionStatus(sessionId: number, status: string, agentName?: string) {
    const session = await (prisma as any).live_chat_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Chat session not found");
    }

    const updated = await (prisma as any).live_chat_sessions.update({
      where: { id: sessionId },
      data: { status },
    });

    if (status === "RESOLVED") {
      await (prisma as any).live_chat_messages.create({
        data: {
          session_id: sessionId,
          sender_type: "SYSTEM",
          sender_name: "System",
          message: `This support conversation was marked as resolved by ${agentName || "Support Specialist"}.`,
          is_read: true,
        },
      });
    } else if (status === "CLOSED") {
      await (prisma as any).live_chat_messages.create({
        data: {
          session_id: sessionId,
          sender_type: "SYSTEM",
          sender_name: "System",
          message: "This chat session has been closed.",
          is_read: true,
        },
      });
    }

    return updated;
  }
}
