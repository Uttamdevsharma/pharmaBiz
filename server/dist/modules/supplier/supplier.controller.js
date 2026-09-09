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
            const { startDate, endDate } = req.query;
            const supplier = await supplier_service_1.SupplierService.getSupplierById(id, tenantId, { startDate, endDate });
            res.status(200).json({ success: true, data: supplier });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    // --- Contact Person Handlers ---
    static async listContacts(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const contacts = await supplier_service_1.SupplierService.listContacts(id, tenantId);
            res.status(200).json({ success: true, data: contacts });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createContact(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const contact = await supplier_service_1.SupplierService.createContact(id, tenantId, req.body);
            res.status(201).json({ success: true, message: "Contact person created successfully", data: contact });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateContact(req, res) {
        try {
            const { id, contactId } = req.params;
            const tenantId = req.user.tenantId;
            const contact = await supplier_service_1.SupplierService.updateContact(contactId, id, tenantId, req.body);
            res.status(200).json({ success: true, message: "Contact person updated successfully", data: contact });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteContact(req, res) {
        try {
            const { id, contactId } = req.params;
            const tenantId = req.user.tenantId;
            const result = await supplier_service_1.SupplierService.deleteContact(contactId, id, tenantId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
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
    static async getSupplierPurchases(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = { ...req.query, supplierId: id };
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
    static async listSupplierPayments(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await supplier_service_1.SupplierService.listSupplierPayments(tenantId, query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getSupplierDueSummary(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const result = await supplier_service_1.SupplierService.getSupplierDueSummary(tenantId, query);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.SupplierController = SupplierController;
