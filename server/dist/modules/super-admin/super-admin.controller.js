"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminController = void 0;
const super_admin_service_1 = require("./super-admin.service");
class SuperAdminController {
    // Plans
    static async createPlan(req, res) {
        try {
            const plan = await super_admin_service_1.SuperAdminService.createPlan(req.body);
            res.status(201).json({
                success: true,
                message: "Subscription plan created successfully",
                data: plan,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listPlans(req, res) {
        try {
            const plans = await super_admin_service_1.SuperAdminService.listPlans();
            res.status(200).json({ success: true, data: plans });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getPlanById(req, res) {
        try {
            const id = req.params.id;
            const plan = await super_admin_service_1.SuperAdminService.getPlanById(id);
            res.status(200).json({ success: true, data: plan });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async updatePlan(req, res) {
        try {
            const id = req.params.id;
            const updated = await super_admin_service_1.SuperAdminService.updatePlan(id, req.body);
            res.status(200).json({
                success: true,
                message: "Subscription plan updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deletePlan(req, res) {
        try {
            const id = req.params.id;
            const result = await super_admin_service_1.SuperAdminService.deletePlan(id);
            res.status(200).json({
                success: true,
                message: "Subscription plan deactivated or removed successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    // Tenants
    static async listTenants(req, res) {
        try {
            const query = req.query;
            const result = await super_admin_service_1.SuperAdminService.listTenants(query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getTenantDetails(req, res) {
        try {
            const id = req.params.id;
            const tenant = await super_admin_service_1.SuperAdminService.getTenantDetails(id);
            res.status(200).json({ success: true, data: tenant });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async getTenantSubscription(req, res) {
        try {
            const id = req.params.id;
            const subscriptions = await super_admin_service_1.SuperAdminService.getTenantSubscription(id);
            res.status(200).json({ success: true, data: subscriptions });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async updateTenantStatus(req, res) {
        try {
            const id = req.params.id;
            const { isActive } = req.body;
            const updated = await super_admin_service_1.SuperAdminService.updateTenantStatus(id, isActive);
            res.status(200).json({
                success: true,
                message: `Tenant has been ${isActive ? "activated" : "suspended"} successfully`,
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    // Subscriptions
    static async listSubscriptions(req, res) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const status = req.query.status;
            const result = await super_admin_service_1.SuperAdminService.listSubscriptions(page, limit, status);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // Payments
    static async listPayments(req, res) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const result = await super_admin_service_1.SuperAdminService.listPlatformPayments(page, limit);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // Analytics
    static async getAnalytics(req, res) {
        try {
            const analytics = await super_admin_service_1.SuperAdminService.getPlatformAnalytics();
            res.status(200).json({ success: true, data: analytics });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.SuperAdminController = SuperAdminController;
