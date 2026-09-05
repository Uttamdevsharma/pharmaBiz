"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
class UserController {
    /**
     * ==================== PHARMACY ROLE CONTROLLERS ====================
     */
    static async listRoles(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const roles = await user_service_1.UserService.listPharmacyRoles(tenantId);
            res.status(200).json({ success: true, data: roles });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createRole(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const role = await user_service_1.UserService.createPharmacyRole(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Role created successfully",
                data: role,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateRole(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const role = await user_service_1.UserService.updatePharmacyRole(tenantId, id, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Role updated successfully",
                data: role,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteRole(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await user_service_1.UserService.deletePharmacyRole(tenantId, id, userId);
            res.status(200).json(result);
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async getPermissionsHierarchy(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const permissions = await user_service_1.UserService.getPermissionsHierarchy(tenantId);
            res.status(200).json({ success: true, data: permissions });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async updateRolePermissions(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const { role, permissions } = req.body;
            // Find role by id or name
            const roles = await user_service_1.UserService.listPharmacyRoles(tenantId);
            const matched = roles.find((r) => r.id === role || r.name === role);
            if (matched) {
                const updated = await user_service_1.UserService.updatePharmacyRole(tenantId, matched.id, userId, { permissions });
                res.status(200).json({ success: true, message: `Permissions updated for role "${matched.name}"`, data: updated });
            }
            else {
                res.status(404).json({ success: false, message: "Role not found" });
            }
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * ==================== PHARMACY STAFF CONTROLLERS ====================
     */
    static async createUser(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const creatorId = req.user.id;
            const creatorRole = req.user.role;
            const user = await user_service_1.UserService.createUser(tenantId, creatorId, creatorRole, req.body);
            res.status(201).json({
                success: true,
                message: "Staff member created successfully",
                data: user,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listUsers(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await user_service_1.UserService.listUsers(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getUserDetails(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const user = await user_service_1.UserService.getUserDetails(id, tenantId);
            res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const updaterId = req.user.id;
            const updaterRole = req.user.role;
            const updated = await user_service_1.UserService.updateUser(id, tenantId, updaterId, updaterRole, req.body);
            res.status(200).json({
                success: true,
                message: "Staff member updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            const tenantId = req.user.tenantId;
            const updaterId = req.user.id;
            const updaterRole = req.user.role;
            const updated = await user_service_1.UserService.updateUserStatus(id, tenantId, updaterId, updaterRole, isActive);
            res.status(200).json({
                success: true,
                message: `Staff member ${isActive ? "activated" : "deactivated"} successfully`,
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const deleterId = req.user.id;
            const deleterRole = req.user.role;
            const result = await user_service_1.UserService.deleteUser(id, tenantId, deleterId, deleterRole);
            res.status(200).json(result);
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.UserController = UserController;
