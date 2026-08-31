import { prisma } from "../../app/lib/prisma";
import { ListNotificationsQuery } from "./notification.validation";

export class NotificationService {
  static async listNotifications(
    tenantId: string,
    query: ListNotificationsQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.OR = [
        { branchId: userBranchId },
        { branchId: null },
      ];
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      (prisma as any).notification.count({ where }),
      (prisma as any).notification.count({ where: { ...where, isRead: false } }),
      (prisma as any).notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async markAsRead(id: string, tenantId: string) {
    const notification = await (prisma as any).notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return await (prisma as any).notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(tenantId: string, branchId?: string | null) {
    const where: any = { tenantId, isRead: false };
    if (branchId) {
      where.branchId = branchId;
    }

    const result = await (prisma as any).notification.updateMany({
      where,
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  static async getAlertsByType(tenantId: string, type: "LOW_STOCK" | "EXPIRY" | "SYNC_FAILURE") {
    return await (prisma as any).notification.findMany({
      where: { tenantId, type, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }
}
