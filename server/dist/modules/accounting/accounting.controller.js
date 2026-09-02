"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingController = void 0;
const accounting_service_1 = require("./accounting.service");
const report_service_1 = require("../report/report.service");
class AccountingController {
    static async listAccounts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = req.query.branchId;
            const accounts = await accounting_service_1.AccountingService.listAccounts(tenantId, branchId);
            res.json({ success: true, data: accounts });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async createAccount(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const account = await accounting_service_1.AccountingService.createAccount(tenantId, userId, req.body);
            res.status(201).json({ success: true, data: account });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async transferFunds(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await accounting_service_1.AccountingService.transferFunds(tenantId, userId, req.body);
            res.json({
                success: true,
                message: "Funds transferred successfully",
                data: result,
            });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async recordTransaction(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await accounting_service_1.AccountingService.recordIncomeExpense(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Financial transaction recorded successfully",
                data: result,
            });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async listTransactions(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const result = await accounting_service_1.AccountingService.listTransactions(tenantId, req.query);
            res.json({ success: true, ...result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getOverview(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = req.query.branchId;
            const options = {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                period: req.query.period,
            };
            const overview = await accounting_service_1.AccountingService.getFinancialOverview(tenantId, branchId, options);
            res.json({ success: true, data: overview });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
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
}
exports.AccountingController = AccountingController;
