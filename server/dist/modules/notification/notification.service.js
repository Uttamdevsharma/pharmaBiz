"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = require("../../app/lib/prisma");
class NotificationService {
    static async listNotifications(tenantId, query, userRole, userBranchId) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.OR = [
                { branchId: userBranchId },
                { branchId: null },
            ];
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.type) {
            where.type = query.type;
        }
        if (query.isRead !== undefined) {
            where.isRead = query.isRead;
        }
        const [total, unreadCount, notifications] = await Promise.all([
            prisma_1.prisma.notification.count({ where }),
            prisma_1.prisma.notification.count({ where: { ...where, isRead: false } }),
            prisma_1.prisma.notification.findMany({
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
    static async markAsRead(id, tenantId) {
        const notification = await prisma_1.prisma.notification.findFirst({
            where: { id, tenantId },
        });
        if (!notification) {
            throw new Error("Notification not found");
        }
        return await prisma_1.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }
    static async markAllAsRead(tenantId, branchId) {
        const where = { tenantId, isRead: false };
        if (branchId) {
            where.branchId = branchId;
        }
        const result = await prisma_1.prisma.notification.updateMany({
            where,
            data: { isRead: true },
        });
        return { updatedCount: result.count };
    }
    static async getAlertsByType(tenantId, type) {
        return await prisma_1.prisma.notification.findMany({
            where: { tenantId, type, isRead: false },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                branch: { select: { id: true, name: true } },
            },
        });
    }
}
exports.NotificationService = NotificationService;
