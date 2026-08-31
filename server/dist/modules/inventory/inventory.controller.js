"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("./inventory.service");
class InventoryController {
    static async getBranchInventory(req, res) {
        try {
            const { branchId } = req.params;
            const tenantId = req.user.tenantId;
            const query = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
                search: req.query.search,
                category: req.query.category,
            };
            const result = await inventory_service_1.InventoryService.getBranchInventory(tenantId, branchId, query);
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
    static async listMovements(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await inventory_service_1.InventoryService.listMovements(tenantId, query, userRole, userBranchId);
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
}
exports.InventoryController = InventoryController;
