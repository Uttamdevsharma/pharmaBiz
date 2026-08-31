import { prisma } from "../../app/lib/prisma";
import { ListAuditLogsQuery } from "./audit.validation";

export class AuditLogService {
  static async listLogs(
    tenantId: string,
    query: ListAuditLogsQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (["BRANCH_MANAGER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = { contains: query.action, mode: "insensitive" };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, logs] = await Promise.all([
      (prisma as any).auditLog.count({ where }),
      (prisma as any).auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Populate user names
    const userIds = logs.map((l: any) => l.userId).filter(Boolean);
    const users = await (prisma as any).user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true, role: true },
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const enrichedLogs = logs.map((l: any) => ({
      ...l,
      user: l.userId ? userMap.get(l.userId) || null : null,
    }));

    return {
      data: enrichedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getLogDetails(id: string, tenantId: string) {
    const log = await (prisma as any).auditLog.findFirst({
      where: { id, tenantId },
      include: {
        branch: true,
      },
    });

    if (!log) {
      throw new Error("Audit log entry not found");
    }

    let user = null;
    if (log.userId) {
      user = await (prisma as any).user.findUnique({
        where: { id: log.userId },
        select: { id: true, name: true, username: true, role: true },
      });
    }

    return {
      ...log,
      user,
    };
  }
}
