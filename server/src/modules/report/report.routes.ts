import { Router } from "express";
import { ReportController } from "./report.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, requireTier } from "../../middleware/planLimiter";
import { reportDateRangeSchema, vatMisReportSchema } from "./report.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Owner / Manager Dashboard Metrics
router.get("/dashboard", ReportController.getDashboardMetrics);

// Sales Reports
router.get("/sales/daily", validateRequest({ query: reportDateRangeSchema }), ReportController.getDailySales);
router.get("/sales/weekly", validateRequest({ query: reportDateRangeSchema }), ReportController.getWeeklySales);
router.get("/sales/monthly", validateRequest({ query: reportDateRangeSchema }), ReportController.getMonthlySales);

router.get(
  "/sales/branch-wise",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ query: reportDateRangeSchema }),
  ReportController.getBranchWiseSales
);

router.get(
  "/sales/region-wise",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  requireTier("GROWTH"),
  validateRequest({ query: reportDateRangeSchema }),
  ReportController.getRegionWiseSales
);

router.get(
  "/sales/company-wide",
  authorize(["COMPANY_OWNER", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ query: reportDateRangeSchema }),
  ReportController.getCompanyWideSales
);

// Inventory Reports
router.get("/inventory", ReportController.getInventoryReport);

// VAT / MIS Compliance Report
router.get(
  "/vat-mis",
  authorize(["COMPANY_OWNER", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ query: vatMisReportSchema }),
  ReportController.getVatMisReport
);

export { router as reportRoutes };
