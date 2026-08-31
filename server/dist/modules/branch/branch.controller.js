"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchController = void 0;
const branch_service_1 = require("./branch.service");
class BranchController {
    static async createBranch(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const branch = await branch_service_1.BranchService.createBranch(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Branch created successfully",
                data: branch,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listBranches(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const branches = await branch_service_1.BranchService.listBranches(tenantId, userRole, userBranchId);
            res.status(200).json({ success: true, data: branches });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getBranchDetails(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const branch = await branch_service_1.BranchService.getBranchDetails(id, tenantId);
            res.status(200).json({ success: true, data: branch });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async updateBranch(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const updated = await branch_service_1.BranchService.updateBranch(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Branch updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteBranch(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await branch_service_1.BranchService.deleteBranch(id, tenantId, userId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.BranchController = BranchController;
