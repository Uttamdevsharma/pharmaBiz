"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingController = void 0;
const accounting_service_1 = require("./accounting.service");
const report_service_1 = require("../report/report.service");
const prisma_1 = require("../../app/lib/prisma");
class AccountingController {
    static async listAccounts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const user = req.user;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const branchId = isOwner ? req.query.branchId : (user.branchId || req.query.branchId);
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
    static async updateAccount(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const accountId = req.params.id;
            const account = await accounting_service_1.AccountingService.updateAccount(tenantId, accountId, userId, req.body);
            res.status(200).json({ success: true, data: account, message: "Account updated successfully" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async deleteAccount(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const accountId = req.params.id;
            await accounting_service_1.AccountingService.deleteAccount(tenantId, accountId, userId);
            res.status(200).json({ success: true, message: "Financial account removed successfully" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async depositFunds(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const account = await accounting_service_1.AccountingService.depositFunds(tenantId, userId, req.body);
            res.json({
                success: true,
                message: `Successfully deposited funds into ${account.name}`,
                data: account,
            });
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
    // ==========================================
    // 🏢 RECURRING EXPENSES
    // ==========================================
    static async listRecurringExpenses(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = req.query.branchId;
            const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
            const data = await accounting_service_1.AccountingService.listRecurringExpenses(tenantId, branchId, includeInactive);
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async createRecurringExpense(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const data = await accounting_service_1.AccountingService.createRecurringExpense(tenantId, req.body);
            res.status(201).json({ success: true, data, message: "Recurring bill configured successfully" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async updateRecurringExpense(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const data = await accounting_service_1.AccountingService.updateRecurringExpense(tenantId, req.params.id, req.body);
            res.json({ success: true, data, message: "Recurring bill updated successfully" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async deleteRecurringExpense(req, res) {
        try {
            const tenantId = req.user.tenantId;
            await accounting_service_1.AccountingService.deleteRecurringExpense(tenantId, req.params.id);
            res.json({ success: true, message: "Recurring bill removed" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    // ==========================================
    // 💸 ACTUAL MONTHLY EXPENSE PAYMENTS
    // ==========================================
    static async listExpenses(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const result = await accounting_service_1.AccountingService.listExpenses(tenantId, req.query);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async recordExpense(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const expense = await accounting_service_1.AccountingService.recordExpense(tenantId, userId, req.body);
            res.status(201).json({ success: true, data: expense, message: "Expense payment recorded and account debited" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getExpenseSummary(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = req.query.branchId;
            const month = req.query.month;
            const summary = await accounting_service_1.AccountingService.getExpenseSummary(tenantId, branchId, month);
            res.json({ success: true, data: summary });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    // ==========================================
    // 👥 STAFF SALARY MANAGEMENT
    // ==========================================
    static async listBranchStaffSalaries(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const user = req.user;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const branchId = isOwner ? (req.query.branchId || user.branchId || "") : (user.branchId || req.query.branchId || "");
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const employees = await accounting_service_1.AccountingService.listBranchStaffSalaries(tenantId, branchId, month, includeInactive);
            res.json({ success: true, data: employees });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async setSalaryConfig(req, res) {
        try {
            const user = req.user;
            const tenantId = user.tenantId;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const isBranchManager = user.role === "BRANCH_MANAGER" ||
                user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                user.customRoleName?.toLowerCase().includes("branch manager") ||
                user.permissions?.includes("salaries.base_salary.edit") ||
                user.permissions?.includes("accounts.salaries") ||
                user.permissions?.includes("*");
            // Only Pharmacy Owner and Branch Manager can set or update Base Salary
            if (!isOwner && !isBranchManager) {
                const existing = await prisma_1.prisma.employeeSalaryConfig.findUnique({
                    where: {
                        tenantId_userId: {
                            tenantId,
                            userId: req.body.userId,
                        },
                    },
                });
                const incomingBase = Number(req.body.baseSalary);
                if (existing && existing.baseSalary !== incomingBase) {
                    res.status(403).json({
                        success: false,
                        message: "Forbidden: Only Pharmacy Owner and Branch Manager can set or update Base Salary.",
                    });
                    return;
                }
            }
            const branchId = isOwner ? (req.body.branchId || user.branchId) : (user.branchId || req.body.branchId);
            const result = await accounting_service_1.AccountingService.setSalaryConfig(tenantId, {
                ...req.body,
                branchId,
            });
            res.json({ success: true, message: "Salary configuration saved successfully", data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async disburseSalary(req, res) {
        try {
            const user = req.user;
            const tenantId = user.tenantId;
            const disbursedById = user.id;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const branchId = isOwner ? (req.body.branchId || user.branchId || "") : (user.branchId || req.body.branchId || "");
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const payload = {
                ...req.body,
                branchId,
            };
            const result = await accounting_service_1.AccountingService.disburseSalary(tenantId, disbursedById, payload);
            res.status(201).json({ success: true, data: result, message: "Salary paid successfully and financial account debited" });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getBranchSalaryHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const user = req.user;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const branchId = isOwner ? (req.query.branchId || user.branchId || "") : (user.branchId || req.query.branchId || "");
            const month = req.query.month;
            const userId = req.query.userId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const data = await accounting_service_1.AccountingService.getBranchSalaryHistory(tenantId, branchId, {
                month,
                userId,
                page,
                limit,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getEmployeeSalaryHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.params.userId;
            const user = req.user;
            const actorRole = user.role;
            const isManagerOrAccounts = actorRole === "COMPANY_OWNER" ||
                actorRole === "SUPER_ADMIN" ||
                actorRole === "REGIONAL_ADMIN" ||
                actorRole === "BRANCH_MANAGER" ||
                actorRole === "ACCOUNTS" ||
                user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                user.customRoleName?.toLowerCase().includes("branch manager");
            if (!isManagerOrAccounts && user.id !== userId) {
                res.status(403).json({ success: false, message: "Forbidden: You can only view your own salary history." });
                return;
            }
            const history = await accounting_service_1.AccountingService.getEmployeeSalaryHistory(tenantId, userId, user);
            res.json({ success: true, data: history });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getMySalaryHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const history = await accounting_service_1.AccountingService.getMySalaryHistory(tenantId, userId);
            res.json({ success: true, data: history });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}
exports.AccountingController = AccountingController;
