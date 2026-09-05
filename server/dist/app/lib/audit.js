"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const prisma_1 = require("./prisma");
class AuditService {
    static async log(params) {
        try {
            await prisma_1.prisma.auditLog.create({
                data: {
                    tenantId: params.tenantId,
                    branchId: params.branchId || null,
                    userId: params.userId || null,
                    action: params.action,
                    details: params.details ? params.details : undefined,
                    ipAddress: params.ipAddress || null,
                    userAgent: params.userAgent || null,
                },
            });
        }
        catch (error) {
            console.error("[AuditService] Failed to record audit log:", error);
        }
    }
}
exports.AuditService = AuditService;
