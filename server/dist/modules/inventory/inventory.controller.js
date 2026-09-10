"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("./inventory.service");
class InventoryController {
    static async getBranchInventory(req, res) {
        try {
            const user = req.user;
            const tenantId = user.tenantId;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
            // If user is restricted to a branch, force that branch
            let targetBranchId = req.params.branchId || req.query.branchId || req.headers["x-branch-id"];
            if (!isOwner && user.branchId) {
                targetBranchId = user.branchId;
            }
            else if (targetBranchId === "all" || targetBranchId === "all-branches") {
                targetBranchId = undefined;
            }
            const query = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
                search: req.query.search,
                category: req.query.category,
            };
            const result = await inventory_service_1.InventoryService.getBranchInventory(tenantId, targetBranchId, query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async inwardStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await inventory_service_1.InventoryService.inwardStock(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Stock inward recorded successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async adjustStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await inventory_service_1.InventoryService.adjustStock(tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Stock adjusted successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateInventoryItem(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const updated = await inventory_service_1.InventoryService.updateInventoryItem(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Inventory item updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async allocateStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await inventory_service_1.InventoryService.allocateStock(tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Stock allocated successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async moveStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await inventory_service_1.InventoryService.moveStock(tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Stock moved successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async removeExpiredStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await inventory_service_1.InventoryService.removeExpiredStock(tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Expired stock removed successfully and logged in movement ledger",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listMovements(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            if (query.type === "PURCHASE") {
                const result = await inventory_service_1.InventoryService.listReceivingHistory(tenantId, query, userRole, userBranchId);
                res.status(200).json({ success: true, ...result });
                return;
            }
            const result = await inventory_service_1.InventoryService.listMovements(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async listReceivingHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await inventory_service_1.InventoryService.listReceivingHistory(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getLowStock(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await inventory_service_1.InventoryService.getLowStockItems(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getNearExpiry(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await inventory_service_1.InventoryService.getNearExpiryItems(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getPosBatches(req, res) {
        try {
            const { branchId, productId } = req.query;
            const tenantId = req.user.tenantId;
            if (!branchId || !productId) {
                res.status(400).json({ success: false, message: "branchId and productId are required" });
                return;
            }
            const batches = await inventory_service_1.InventoryService.getPosAvailableBatches(tenantId, branchId, productId);
            res.status(200).json({ success: true, data: batches });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getBatchDetails(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const batch = await inventory_service_1.InventoryService.getBatchDetails(tenantId, id);
            res.status(200).json({ success: true, data: batch });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
}
exports.InventoryController = InventoryController;
