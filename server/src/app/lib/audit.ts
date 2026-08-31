import { prisma } from "./prisma";

export interface LogAuditParams {
  tenantId: string;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Log an audit trail entry safely (non-blocking for errors)
   */
  static async log(params: LogAuditParams): Promise<void> {
    try {
      await (prisma as any).auditLog.create({
        data: {
          tenantId: params.tenantId,
          branchId: params.branchId || null,
          userId: params.userId || null,
          action: params.action,
          details: params.details ? (params.details as any) : undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error("[AuditService] Failed to record audit log:", error);
    }
  }
}
