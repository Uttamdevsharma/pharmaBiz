"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const tenant_service_1 = require("./tenant.service");
class TenantController {
    static async getProfile(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const profile = await tenant_service_1.TenantService.getProfile(tenantId);
            res.status(200).json({ success: true, data: profile });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async updateProfile(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const updated = await tenant_service_1.TenantService.updateProfile(tenantId, req.body);
            res.status(200).json({
                success: true,
                message: "Company profile updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async getSubscription(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const subInfo = await tenant_service_1.TenantService.getSubscriptionAndLimits(tenantId);
            res.status(200).json({ success: true, data: subInfo });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getUsage(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const subInfo = await tenant_service_1.TenantService.getSubscriptionAndLimits(tenantId);
            res.status(200).json({
                success: true,
                data: {
                    usage: subInfo.usage,
                    features: subInfo.features,
                },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.TenantController = TenantController;
