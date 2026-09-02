"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const report_controller_1 = require("./report.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const report_validation_1 = require("./report.validation");
const router = (0, express_1.Router)();
exports.reportRoutes = router;
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// Owner / Manager Dashboard Metrics
router.get("/dashboard", report_controller_1.ReportController.getDashboardMetrics);
// Sales Reports
router.get("/sales/daily", (0, validate_1.validateRequest)({ query: report_validation_1.reportDateRangeSchema }), report_controller_1.ReportController.getDailySales);
router.get("/sales/weekly", (0, validate_1.validateRequest)({ query: report_validation_1.reportDateRangeSchema }), report_controller_1.ReportController.getWeeklySales);
router.get("/sales/monthly", (0, validate_1.validateRequest)({ query: report_validation_1.reportDateRangeSchema }), report_controller_1.ReportController.getMonthlySales);
router.get("/sales/branch-wise", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ query: report_validation_1.reportDateRangeSchema }), report_controller_1.ReportController.getBranchWiseSales);
router.get("/sales/region-wise", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, planLimiter_1.requireTier)("GROWTH"), (0, validate_1.validateRequest)({ query: report_validation_1.reportDateRangeSchema }), report_controller_1.ReportController.getRegionWiseSales);
router.get("/sales/company-wide", (0, authorize_1.authorize)(["COMPANY_OWNER", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ query: report_validation_1.reportDateRangeSchema }), report_controller_1.ReportController.getCompanyWideSales);
// Inventory Reports
router.get("/inventory", report_controller_1.ReportController.getInventoryReport);
// VAT / MIS Compliance Report
router.get("/vat-mis", (0, authorize_1.authorize)(["COMPANY_OWNER", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ query: report_validation_1.vatMisReportSchema }), report_controller_1.ReportController.getVatMisReport);
