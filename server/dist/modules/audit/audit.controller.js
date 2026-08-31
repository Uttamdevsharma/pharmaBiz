"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const audit_service_1 = require("./audit.service");
class AuditController {
    static async listLogs(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await audit_service_1.AuditLogService.listLogs(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getLogDetails(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const log = await audit_service_1.AuditLogService.getLogDetails(id, tenantId);
            res.status(200).json({ success: true, data: log });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
}
exports.AuditController = AuditController;
