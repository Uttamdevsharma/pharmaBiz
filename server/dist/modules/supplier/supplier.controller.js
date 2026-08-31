"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierController = void 0;
const supplier_service_1 = require("./supplier.service");
class SupplierController {
    static async listSuppliers(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await supplier_service_1.SupplierService.listSuppliers(tenantId, query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getSupplierById(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const supplier = await supplier_service_1.SupplierService.getSupplierById(id, tenantId);
            res.status(200).json({ success: true, data: supplier });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async createSupplier(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const supplier = await supplier_service_1.SupplierService.createSupplier(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Supplier created successfully",
                data: supplier,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const updated = await supplier_service_1.SupplierService.updateSupplier(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Supplier updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteSupplier(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await supplier_service_1.SupplierService.deleteSupplier(id, tenantId, userId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async recordPurchase(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const purchase = await supplier_service_1.SupplierService.recordPurchase(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Purchase & stock inward recorded successfully",
                data: purchase,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listPurchases(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await supplier_service_1.SupplierService.listPurchases(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async recordSupplierPayment(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const updated = await supplier_service_1.SupplierService.recordSupplierPayment(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Payment recorded against supplier due",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.SupplierController = SupplierController;
