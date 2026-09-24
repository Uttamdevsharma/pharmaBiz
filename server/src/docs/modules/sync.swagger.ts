export const syncSwagger = {
  paths: {
    "/api/sync/push/sales": {
      post: {
        tags: ["Offline Sync"],
        summary: "Push batch of offline completed sales to cloud",
        description: "Enables desktop/offline POS nodes to flush cached sales when internet connectivity resumes.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PushSalesBatchDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                sales: [
                  {
                    localId: "local-sale-001",
                    receiptNo: "REC-OFFLINE-9901",
                    branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                    userId: "u-cashier-uuid",
                    subTotal: 100,
                    discount: 0,
                    tax: 0,
                    totalAmount: 100,
                    paymentMethod: "CASH",
                    localCreatedAt: "2026-09-22T08:00:00Z",
                    items: [
                      {
                        productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                        quantity: 4,
                        unitPrice: 25.0,
                        subTotal: 100,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        responses: { 200: { description: "Sales batch synced successfully" } },
      },
    },
    "/api/sync/push/stock": {
      post: {
        tags: ["Offline Sync"],
        summary: "Push batch of offline stock adjustments",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PushStockBatchDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                adjustments: [
                  {
                    localId: "adj-local-01",
                    branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                    productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                    quantityChange: -1,
                    type: "DAMAGE",
                    reason: "Broken ampoule",
                    localCreatedAt: "2026-09-22T08:15:00Z",
                  },
                ],
              },
            },
          },
        },
        responses: { 200: { description: "Stock batch synced" } },
      },
    },
    "/api/sync/pull": {
      get: {
        tags: ["Offline Sync"],
        summary: "Pull updated products, prices, and batches to branch node",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", required: true, schema: { type: "string" } },
          { name: "lastSyncedAt", in: "query", schema: { type: "string" }, description: "ISO timestamp of last sync" },
        ],
        responses: { 200: { description: "Updated delta payload" } },
      },
    },
    "/api/sync/status/{branchId}": {
      get: {
        tags: ["Offline Sync"],
        summary: "Check current branch sync status and health",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Branch sync status" } },
      },
    },
    "/api/sync/logs": {
      get: {
        tags: ["Offline Sync"],
        summary: "List sync history logs & conflicts",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "branchId", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Sync logs" } },
      },
    },
  },
  schemas: {
    PushSalesBatchDto: {
      type: "object",
      required: ["branchId", "sales"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        sales: {
          type: "array",
          items: {
            type: "object",
            required: ["localId", "receiptNo", "branchId", "userId", "subTotal", "totalAmount", "localCreatedAt", "items"],
            properties: {
              localId: { type: "string" },
              receiptNo: { type: "string" },
              branchId: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              subTotal: { type: "number" },
              totalAmount: { type: "number" },
              paymentMethod: { type: "string", enum: ["CASH", "CARD", "MOBILE"], default: "CASH" },
              localCreatedAt: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    productId: { type: "string", format: "uuid" },
                    quantity: { type: "integer" },
                    unitPrice: { type: "number" },
                    subTotal: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    PushStockBatchDto: {
      type: "object",
      required: ["branchId", "adjustments"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        adjustments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              localId: { type: "string" },
              branchId: { type: "string", format: "uuid" },
              productId: { type: "string", format: "uuid" },
              quantityChange: { type: "integer" },
              type: { type: "string" },
              localCreatedAt: { type: "string" },
            },
          },
        },
      },
    },
  },
};
