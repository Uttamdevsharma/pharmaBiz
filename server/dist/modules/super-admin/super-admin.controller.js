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
            const datePreset = req.query.datePreset;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const tier = req.query.tier;
            const search = req.query.search;
            const result = await super_admin_service_1.SuperAdminService.listSubscriptions(page, limit, status, { datePreset, startDate, endDate, tier, search });
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
            const datePreset = req.query.datePreset;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const analytics = await super_admin_service_1.SuperAdminService.getPlatformAnalytics({ datePreset, startDate, endDate });
            res.status(200).json({ success: true, data: analytics });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    // ==================== PLATFORM DYNAMIC ROLES ====================
    static async listRoles(req, res) {
        try {
            const roles = await super_admin_service_1.SuperAdminService.listRoles();
            res.status(200).json({ success: true, data: roles });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createRole(req, res) {
        try {
            const role = await super_admin_service_1.SuperAdminService.createRole(req.body);
            res.status(201).json({
                success: true,
                message: `Custom role "${role.name}" created successfully`,
                data: role,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateRole(req, res) {
        try {
            const id = req.params.id;
            const updated = await super_admin_service_1.SuperAdminService.updateRole(id, req.body);
            res.status(200).json({
                success: true,
                message: `Role "${updated.name}" updated successfully`,
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteRole(req, res) {
        try {
            const id = req.params.id;
            const result = await super_admin_service_1.SuperAdminService.deleteRole(id);
            res.status(200).json(result);
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async batchUpdateRolePermissions(req, res) {
        try {
            const { matrix } = req.body;
            const result = await super_admin_service_1.SuperAdminService.batchUpdateRolePermissions(matrix);
            res.status(200).json({
                success: true,
                message: "Platform role permissions saved successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    // ==================== PLATFORM STAFF ====================
    static async listPlatformStaff(req, res) {
        try {
            const staff = await super_admin_service_1.SuperAdminService.listPlatformStaff();
            res.status(200).json({ success: true, data: staff });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createPlatformStaff(req, res) {
        try {
            const creatorId = req.user.id;
            const creatorRole = req.user.role;
            const staff = await super_admin_service_1.SuperAdminService.createPlatformStaff(creatorId, creatorRole, req.body);
            res.status(201).json({
                success: true,
                message: `Platform staff member "${staff.name}" (${staff.customRoleName || staff.role}) created successfully`,
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updatePlatformStaff(req, res) {
        try {
            const id = req.params.id;
            const updaterId = req.user.id;
            const updaterRole = req.user.role;
            const updated = await super_admin_service_1.SuperAdminService.updatePlatformStaff(id, updaterId, updaterRole, req.body);
            res.status(200).json({
                success: true,
                message: "Platform staff member updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updatePlatformStaffStatus(req, res) {
        try {
            const id = req.params.id;
            const updaterId = req.user.id;
            const updaterRole = req.user.role;
            const { isActive } = req.body;
            const updated = await super_admin_service_1.SuperAdminService.updatePlatformStaffStatus(id, updaterId, updaterRole, isActive);
            res.status(200).json({
                success: true,
                message: `Platform staff member ${isActive ? "activated" : "deactivated"} successfully`,
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deletePlatformStaff(req, res) {
        try {
            const id = req.params.id;
            const updaterId = req.user.id;
            const updaterRole = req.user.role;
            const result = await super_admin_service_1.SuperAdminService.deletePlatformStaff(id, updaterId, updaterRole);
            res.status(200).json(result);
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async getPlatformPermissions(req, res) {
        try {
            const hierarchy = await super_admin_service_1.SuperAdminService.getPlatformPermissionsHierarchy();
            res.status(200).json({ success: true, data: hierarchy });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async updatePlatformPermissions(req, res) {
        try {
            const { role, permissions } = req.body;
            const result = await super_admin_service_1.SuperAdminService.updatePlatformRolePermissions(role, permissions);
            res.status(200).json({
                success: true,
                message: `Platform permissions for ${role} updated successfully`,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /api/super-admin/verifications
     */
    static async listPharmacyVerifications(req, res) {
        try {
            const { status, search, page, limit, datePreset, startDate, endDate } = req.query;
            const result = await super_admin_service_1.SuperAdminService.listPharmacyVerifications({
                status: status,
                search: search,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                datePreset: datePreset,
                startDate: startDate,
                endDate: endDate,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                metrics: result.metrics,
                pagination: result.pagination,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /api/super-admin/verifications/:id
     */
    static async getPharmacyVerification(req, res) {
        try {
            const id = req.params.id;
            const result = await super_admin_service_1.SuperAdminService.getPharmacyVerification(id);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * POST /api/super-admin/verifications/:id/approve
     */
    static async approvePharmacyVerification(req, res) {
        try {
            const id = req.params.id;
            const adminUserId = req.user.id;
            const result = await super_admin_service_1.SuperAdminService.approvePharmacyVerification(id, adminUserId, req.body);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * POST /api/super-admin/verifications/:id/reject
     */
    static async rejectPharmacyVerification(req, res) {
        try {
            const id = req.params.id;
            const adminUserId = req.user.id;
            const result = await super_admin_service_1.SuperAdminService.rejectPharmacyVerification(id, adminUserId, req.body);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.SuperAdminController = SuperAdminController;
