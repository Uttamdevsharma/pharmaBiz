"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = require("./report.service");
class ReportController {
    static async getDailySales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const report = await report_service_1.ReportService.getDailySales(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getWeeklySales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const report = await report_service_1.ReportService.getWeeklySales(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getMonthlySales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const report = await report_service_1.ReportService.getMonthlySales(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getBranchWiseSales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const report = await report_service_1.ReportService.getBranchWiseSales(tenantId, query);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getRegionWiseSales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const report = await report_service_1.ReportService.getRegionWiseSales(tenantId, query);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getCompanyWideSales(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const report = await report_service_1.ReportService.getCompanyWideSales(tenantId, query);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getInventoryReport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const branchId = req.query.branchId;
            const report = await report_service_1.ReportService.getInventoryReport(tenantId, branchId, userRole, userBranchId);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getVatMisReport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            const report = await report_service_1.ReportService.getVatMisReport(tenantId, query);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.ReportController = ReportController;
