export const reportSwagger = {
  paths: {
    "/api/reports/dashboard": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Owner / Manager Dashboard summary metrics",
        description: "Returns today's sales, total revenue, low stock count, pending orders, and recent transactions.",
        security: [{ bearerAuth: [] }, { branchHeader: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Specific branch or 'all'" },
          { name: "period", in: "query", schema: { type: "string", enum: ["today", "yesterday", "7d", "30d", "all"] } },
        ],
        responses: { 200: { description: "Dashboard summary KPIs" } },
      },
    },
    "/api/reports/sales/daily": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Daily sales revenue report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "branchId", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Daily sales breakdown" } },
      },
    },
    "/api/reports/sales/weekly": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Weekly sales report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Weekly sales metrics" } },
      },
    },
    "/api/reports/sales/monthly": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Monthly sales report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Monthly sales breakdown" } },
      },
    },
    "/api/reports/sales/branch-wise": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Branch-wise revenue comparison",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Branch comparative sales figures" } },
      },
    },
    "/api/reports/sales/region-wise": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Regional sales breakdown (GROWTH & ENTERPRISE tiers)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Region-wise sales statistics" } },
      },
    },
    "/api/reports/sales/company-wide": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Consolidated enterprise company-wide financial report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Company-wide revenue and profits" } },
      },
    },
    "/api/reports/inventory": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Inventory valuation and stock holdings report",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Valuation of stock on hand at cost & selling price" } },
      },
    },
    "/api/reports/vat-mis": {
      get: {
        tags: ["Reports & Analytics"],
        summary: "Government VAT / MIS regulatory compliance report",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "month", in: "query", schema: { type: "string" }, example: "2026-09" },
          { name: "year", in: "query", schema: { type: "integer", default: 2026 } },
        ],
        responses: { 200: { description: "VAT audit and MIS report" } },
      },
    },
  },
};
