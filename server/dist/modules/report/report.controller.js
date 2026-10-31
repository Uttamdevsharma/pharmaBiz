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
    static async getDashboardMetrics(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const userId = req.user.id;
            const branchId = req.query.branchId;
            const period = req.query.period;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const dashboard = await report_service_1.ReportService.getDashboardMetrics(tenantId, branchId, userRole, userBranchId, userId, period, startDate, endDate);
            res.status(200).json({ success: true, data: dashboard });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getBranchReportSummary(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userBranchId = req.user.branchId;
            const branchId = req.query.branchId || userBranchId;
            const dateStr = req.query.date || new Date().toISOString().split("T")[0];
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const report = await report_service_1.ReportService.getBranchReportSummary(tenantId, branchId, dateStr);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Failed to fetch branch report summary" });
        }
    }
    static async getMonthlySalesSummary(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userBranchId = req.user.branchId;
            const branchId = req.query.branchId || userBranchId;
            const monthStr = req.query.month || new Date().toISOString().slice(0, 7);
            const categoryId = req.query.categoryId;
            const subcategoryId = req.query.subcategoryId;
            const report = await report_service_1.ReportService.getMonthlySalesSummary(tenantId, branchId, monthStr, { categoryId, subcategoryId });
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Failed to fetch monthly sales summary" });
        }
    }
    static async getPurchaseReport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userBranchId = req.user.branchId;
            const branchId = req.query.branchId || userBranchId;
            const query = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                supplierId: req.query.supplierId,
                paymentStatus: req.query.paymentStatus,
                search: req.query.search,
                categoryId: req.query.categoryId,
                subcategoryId: req.query.subcategoryId,
            };
            const report = await report_service_1.ReportService.getPurchaseReport(tenantId, branchId, query);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Failed to fetch purchase report" });
        }
    }
    static async getProductStockReport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userBranchId = req.user.branchId;
            const branchId = req.query.branchId || userBranchId;
            const filters = {
                categoryId: req.query.categoryId,
                subcategoryId: req.query.subcategoryId,
                brandId: req.query.brandId,
                search: req.query.search,
            };
            const report = await report_service_1.ReportService.getProductStockReport(tenantId, branchId, filters);
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Failed to fetch product stock report" });
        }
    }
}
exports.ReportController = ReportController;
