export const auditSwagger = {
  paths: {
    "/api/audit": {
      get: {
        tags: ["Audit Logs"],
        summary: "List audit trail logs",
        description: "Returns activity logs tracking logins, inventory edits, pricing overrides, voided sales, and role changes.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "action", in: "query", schema: { type: "string" }, description: "Filter by action keyword (e.g., SALE_CREATE, STOCK_ADJUST)" },
          { name: "userId", in: "query", schema: { type: "string" }, description: "Actor User UUID" },
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Branch UUID" },
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Paginated audit logs" } },
      },
    },
    "/api/audit/{id}": {
      get: {
        tags: ["Audit Logs"],
        summary: "Get audit log entry details",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Audit log details with before/after state diff" } },
      },
    },
  },
};
