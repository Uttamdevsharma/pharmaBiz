"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const sales_service_1 = require("./sales.service");
class SalesController {
    static async createSale(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const sale = await sales_service_1.SalesService.createSale(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Sale processed successfully",
                data: sale,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listSales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await sales_service_1.SalesService.listSales(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getSaleById(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const sale = await sales_service_1.SalesService.getSaleById(id, tenantId);
            res.status(200).json({ success: true, data: sale });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async getReceipt(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const receipt = await sales_service_1.SalesService.getReceiptData(id, tenantId);
            res.status(200).json({ success: true, data: receipt });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async refundSale(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const userRole = req.user.role;
            const refunded = await sales_service_1.SalesService.refundSale(id, tenantId, userId, userRole, req.body);
            res.status(200).json({
                success: true,
                message: "Sale refunded and stock returned to inventory successfully",
                data: refunded,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async voidSale(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const userRole = req.user.role;
            const voided = await sales_service_1.SalesService.voidSale(id, tenantId, userId, userRole, req.body);
            res.status(200).json({
                success: true,
                message: "Sale voided and stock returned to inventory successfully",
                data: voided,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.SalesController = SalesController;
