"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
class NotificationController {
    static async listNotifications(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await notification_service_1.NotificationService.listNotifications(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const updated = await notification_service_1.NotificationService.markAsRead(id, tenantId);
            res.status(200).json({ success: true, message: "Marked as read", data: updated });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async markAllAsRead(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = req.user.branchId;
            const result = await notification_service_1.NotificationService.markAllAsRead(tenantId, branchId);
            res.status(200).json({ success: true, message: "All notifications marked as read", data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getLowStockAlerts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const alerts = await notification_service_1.NotificationService.getAlertsByType(tenantId, "LOW_STOCK");
            res.status(200).json({ success: true, data: alerts });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getExpiryAlerts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const alerts = await notification_service_1.NotificationService.getAlertsByType(tenantId, "EXPIRY");
            res.status(200).json({ success: true, data: alerts });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getSyncFailureAlerts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const alerts = await notification_service_1.NotificationService.getAlertsByType(tenantId, "SYNC_FAILURE");
            res.status(200).json({ success: true, data: alerts });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.NotificationController = NotificationController;
