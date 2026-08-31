import { Request, Response } from "express";
import { AuditLogService } from "./audit.service";
import { ListAuditLogsQuery } from "./audit.validation";

export class AuditController {
  static async listLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ListAuditLogsQuery;

      const result = await AuditLogService.listLogs(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getLogDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const log = await AuditLogService.getLogDetails(id, tenantId);
      res.status(200).json({ success: true, data: log });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
}
