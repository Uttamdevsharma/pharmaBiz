"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const sync_service_1 = require("./sync.service");
class SyncController {
    static async pushSales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const result = await sync_service_1.SyncService.pushSales(tenantId, req.body);
            res.status(200).json({
                success: true,
                message: "Offline sales batch processed",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async pushStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const result = await sync_service_1.SyncService.pushStockAdjustments(tenantId, req.body);
            res.status(200).json({
                success: true,
                message: "Offline stock adjustments batch processed",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async pullUpdates(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await sync_service_1.SyncService.pullUpdates(tenantId, query);
            res.status(200).json({
                success: true,
                message: "Cloud updates fetched successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async getSyncStatus(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const { branchId } = req.params;
            const result = await sync_service_1.SyncService.getSyncStatus(tenantId, branchId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async listSyncLogs(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await sync_service_1.SyncService.listSyncLogs(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.SyncController = SyncController;
