import { prisma } from "../../app/lib/prisma";
import {
  CreateTicketInput,
  CreateReplyInput,
  SupportTicketStatus,
  TicketSenderType,
} from "./support-ticket.types";

export class SupportTicketService {
  /**
   * Helper to generate unique sequential ticket number (e.g. TCK-1001, TCK-1002)
   */
  static async generateTicketNo(): Promise<string> {
    const latest = await (prisma as any).support_tickets.findFirst({
      orderBy: { id: "desc" },
      select: { ticket_no: true, id: true },
    });

    if (!latest || !latest.ticket_no) {
      return "TCK-1001";
    }

    const match = latest.ticket_no.match(/TCK-(\d+)/i);
    if (match && match[1]) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `TCK-${nextNum}`;
    }

    return `TCK-${1000 + (latest.id || 0) + 1}`;
  }

  /**
   * 1. Tenant: Create a new support ticket
   */
  static async createTicket(
    tenantId: string,
    userId: string,
    data: CreateTicketInput
  ) {
    const ticketNo = await this.generateTicketNo();

    const ticket = await (prisma as any).support_tickets.create({
      data: {
        ticket_no: ticketNo,
        business_id: tenantId,
        user_id: userId,
        branch_id: data.branchId || null,
        subject: data.subject,
        message: data.message,
        category: data.category || "QUERY",
        priority: data.priority || "MEDIUM",
        status: "PENDING",
        attachments: data.attachments || null,
        is_admin_read: false,
      },
    });

    return ticket;
  }

  /**
   * 2. Tenant: List tickets for the logged-in pharmacy tenant
   */
  static async listTenantTickets(
    tenantId: string,
    query: {
      search?: string;
      status?: string;
      category?: string;
      priority?: string;
    }
  ) {
    const where: any = { business_id: tenantId };

    if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }

    if (query.category && query.category !== "ALL") {
      where.category = query.category;
    }

    if (query.priority && query.priority !== "ALL") {
      where.priority = query.priority;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { ticket_no: { contains: s, mode: "insensitive" } },
        { subject: { contains: s, mode: "insensitive" } },
        { message: { contains: s, mode: "insensitive" } },
      ];
    }

    const tickets = await (prisma as any).support_tickets.findMany({
      where,
      orderBy: { updated_at: "desc" },
      include: {
        _count: {
          select: { replies: true },
        },
      },
    });

    // Compute unread replies from SUPER_ADMIN for each ticket
    const ticketIds = tickets.map((t: any) => t.id);
    let unreadMap: Record<number, number> = {};

    if (ticketIds.length > 0) {
      const unreadGroup = await (prisma as any).ticket_replies.groupBy({
        by: ["ticket_id"],
        where: {
          ticket_id: { in: ticketIds },
          sender_type: "SUPER_ADMIN",
          is_read: false,
        },
        _count: { id: true },
      });

      unreadGroup.forEach((g: any) => {
        unreadMap[g.ticket_id] = g._count.id;
      });
    }

    const mappedTickets = tickets.map((t: any) => ({
      ...t,
      unread_count: unreadMap[t.id] || 0,
      reply_count: t._count?.replies || 0,
      _count: undefined,
    }));

    // Metrics for Tenant
    const total = await (prisma as any).support_tickets.count({
      where: { business_id: tenantId },
    });
    const pending = await (prisma as any).support_tickets.count({
      where: { business_id: tenantId, status: "PENDING" },
    });
    const inProgress = await (prisma as any).support_tickets.count({
      where: {
        business_id: tenantId,
        status: { in: ["CHECKING", "WORKING", "TESTING"] },
      },
    });
    const resolved = await (prisma as any).support_tickets.count({
      where: {
        business_id: tenantId,
        status: { in: ["SOLVED", "CLOSED"] },
      },
    });

    const unreadTotal = mappedTickets.reduce((acc: number, cur: any) => acc + (cur.unread_count || 0), 0);

    return {
      tickets: mappedTickets,
      unread_total: unreadTotal,
      metrics: {
        total,
        pending,
        inProgress,
        resolved,
      },
    };
  }

  /**
   * 3. Super Admin: List all tickets across all pharmacy tenants
   */
  static async listAdminTickets(query: {
    search?: string;
    business_id?: string;
    status?: string;
    category?: string;
    priority?: string;
  }) {
    const where: any = {};

    if (query.business_id && query.business_id !== "ALL") {
      where.business_id = query.business_id;
    }

    if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }

    if (query.category && query.category !== "ALL") {
      where.category = query.category;
    }

    if (query.priority && query.priority !== "ALL") {
      where.priority = query.priority;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { ticket_no: { contains: s, mode: "insensitive" } },
        { subject: { contains: s, mode: "insensitive" } },
        { message: { contains: s, mode: "insensitive" } },
      ];
    }

    const tickets = await (prisma as any).support_tickets.findMany({
      where,
      orderBy: { updated_at: "desc" },
      include: {
        _count: {
          select: { replies: true },
        },
      },
    });

    // Compute unread replies from TENANT_USER for Super Admin
    const ticketIds = tickets.map((t: any) => t.id);
    let unreadMap: Record<number, number> = {};

    if (ticketIds.length > 0) {
      const unreadGroup = await (prisma as any).ticket_replies.groupBy({
        by: ["ticket_id"],
        where: {
          ticket_id: { in: ticketIds },
          sender_type: "TENANT_USER",
          is_read: false,
        },
        _count: { id: true },
      });

      unreadGroup.forEach((g: any) => {
        unreadMap[g.ticket_id] = g._count.id;
      });
    }

    // Fetch tenant & user names for enrichment
    const tenantIds = Array.from(new Set(tickets.map((t: any) => t.business_id)));
    const userIds = Array.from(new Set(tickets.map((t: any) => t.user_id)));

    const tenants = await (prisma as any).tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, phone: true, email: true },
    });
    const tenantMap = new Map(tenants.map((tn: any) => [tn.id, tn]));

    const users = await (prisma as any).user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const mappedTickets = tickets.map((t: any) => ({
      ...t,
      unread_count: unreadMap[t.id] || 0,
      reply_count: t._count?.replies || 0,
      tenant: tenantMap.get(t.business_id) || null,
      creator: userMap.get(t.user_id) || null,
      _count: undefined,
    }));

    // Metrics for Super Admin
    const allCount = await (prisma as any).support_tickets.count();
    const pendingCount = await (prisma as any).support_tickets.count({
      where: { status: "PENDING" },
    });
    const checkingCount = await (prisma as any).support_tickets.count({
      where: { status: "CHECKING" },
    });
    const workingCount = await (prisma as any).support_tickets.count({
      where: { status: "WORKING" },
    });
    const solvedCount = await (prisma as any).support_tickets.count({
      where: { status: "SOLVED" },
    });

    const unreadTotal = mappedTickets.reduce((acc: number, cur: any) => acc + (cur.unread_count || 0), 0);

    return {
      tickets: mappedTickets,
      unread_total: unreadTotal,
      metrics: {
        all: allCount,
        pending: pendingCount,
        checking: checkingCount,
        working: workingCount,
        solved: solvedCount,
      },
    };
  }

  /**
   * 4. Get Ticket Details & Chronological Conversation (Auto-marks unread as read)
   */
  static async getTicketDetails(ticketId: number, viewerType: "TENANT" | "SUPER_ADMIN") {
    const ticket = await (prisma as any).support_tickets.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error("Support ticket not found");
    }

    // Mark opposite party's replies as read
    const targetSenderType = viewerType === "TENANT" ? "SUPER_ADMIN" : "TENANT_USER";
    await (prisma as any).ticket_replies.updateMany({
      where: {
        ticket_id: ticketId,
        sender_type: targetSenderType,
        is_read: false,
      },
      data: { is_read: true },
    });

    // Fetch all replies
    const replies = await (prisma as any).ticket_replies.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: "asc" },
    });

    // Enrich with creator & tenant info
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: ticket.business_id },
      select: { id: true, name: true, phone: true, email: true },
    });

    const creator = await (prisma as any).user.findUnique({
      where: { id: ticket.user_id },
      select: { id: true, name: true, email: true, phone: true },
    });

    return {
      ticket,
      replies,
      tenant,
      creator,
    };
  }

  /**
   * 5. Add a Reply to ticket thread
   */
  static async addReply(
    ticketId: number,
    senderId: string,
    senderType: TicketSenderType,
    data: CreateReplyInput
  ) {
    const ticket = await (prisma as any).support_tickets.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error("Support ticket not found");
    }

    const reply = await (prisma as any).ticket_replies.create({
      data: {
        ticket_id: ticketId,
        sender_id: senderId,
        sender_type: senderType,
        message: data.message,
        attachments: data.attachments || null,
        is_read: false,
      },
    });

    // Update ticket updated_at
    const updateData: any = { updated_at: new Date() };

    // If tenant replied and status was SOLVED or CLOSED, reopen to WORKING
    if (senderType === "TENANT_USER" && (ticket.status === "SOLVED" || ticket.status === "CLOSED")) {
      updateData.status = "WORKING";
    }

    await (prisma as any).support_tickets.update({
      where: { id: ticketId },
      data: updateData,
    });

    return reply;
  }

  /**
   * 6. Update Ticket Status (Super Admin / Tenant)
   */
  static async updateStatus(ticketId: number, status: SupportTicketStatus) {
    const ticket = await (prisma as any).support_tickets.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error("Support ticket not found");
    }

    const updated = await (prisma as any).support_tickets.update({
      where: { id: ticketId },
      data: {
        status,
        updated_at: new Date(),
      },
    });

    return updated;
  }
}
