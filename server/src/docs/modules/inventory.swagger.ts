export const inventorySwagger = {
  paths: {
    "/api/inventory": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "Get branch inventory stock list",
        description: "Returns stock on hand grouped by product and batch for the specified or active branch.",
        security: [{ bearerAuth: [] }, { branchHeader: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Branch UUID (or 'all' for company-wide)" },
        ],
        responses: { 200: { description: "Branch inventory list" } },
      },
    },
    "/api/inventory/branch/{branchId}": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "Get branch inventory by branch path parameter",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Inventory items" } },
      },
    },
    "/api/inventory/inward": {
      post: {
        tags: ["Inventory & Batches"],
        summary: "Inward stock / Add medicine batch",
        description: "Inwards new shipment batches with carton/box breakdowns, expiry dates, supplier linkages, and payment ledger entries.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InwardStockDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                batchNumber: "BX-2026-901",
                mfgDate: "2026-01-01",
                expiryDate: "2027-12-31",
                receivingUnit: "BOX",
                boxesReceived: 50,
                boxQuantity: 50,
                quantity: 500,
                purchasePrice: 1.8,
                sellingPrice: 2.5,
                shelfLocation: "Rack A / Shelf 2",
                paidAmount: 900,
              },
            },
          },
        },
        responses: { 201: { description: "Stock inwarded successfully" } },
      },
    },
    "/api/inventory/adjust": {
      post: {
        tags: ["Inventory & Batches"],
        summary: "Manual stock adjustment (audit correction, damages, wastage)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdjustStockDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                quantity: -5,
                type: "DAMAGE",
                reason: "Broken ampoules during shelf arrangement",
              },
            },
          },
        },
        responses: { 200: { description: "Stock adjusted" } },
      },
    },
    "/api/inventory/allocate": {
      post: {
        tags: ["Inventory & Batches"],
        summary: "Allocate batch stock to physical rack/shelf/bin",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AllocateStockDto" },
              example: {
                inventoryId: "inv-uuid-1234",
                rack: "Rack A",
                shelf: "Shelf 3",
                bin: "Bin 04",
                quantity: 100,
              },
            },
          },
        },
        responses: { 200: { description: "Stock allocated to location" } },
      },
    },
    "/api/inventory/move": {
      post: {
        tags: ["Inventory & Batches"],
        summary: "Move stock between physical locations inside branch",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MoveStockDto" },
              example: {
                fromLocationId: "loc-src-uuid",
                rack: "Rack B",
                shelf: "Shelf 1",
                quantity: 50,
              },
            },
          },
        },
        responses: { 200: { description: "Stock relocated" } },
      },
    },
    "/api/inventory/remove-expired": {
      post: {
        tags: ["Inventory & Batches"],
        summary: "Dispose / Remove expired medicine stock",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RemoveExpiredDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                inventoryId: "inv-uuid-1234",
                source: "BULK",
                quantity: 20,
                reason: "Expired stock incinerated as per DGDA regulations",
              },
            },
          },
        },
        responses: { 200: { description: "Expired stock written off" } },
      },
    },
    "/api/inventory/pos-batches": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "POS: Get FEFO-sorted batches for a product",
        description: "Returns batches sorted by First-Expiry-First-Out with remaining available quantities for cashier selection.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", required: true, schema: { type: "string" } },
          { name: "productId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "FEFO batch listing" } },
      },
    },
    "/api/inventory/receiving-history": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "List stock receiving & inwarding history",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Receiving history log" } },
      },
    },
    "/api/inventory/movements": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "Stock movements audit ledger",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "productId", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["PURCHASE", "SALE", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "RETURN", "ALLOCATION"] } },
        ],
        responses: { 200: { description: "Stock movements ledger" } },
      },
    },
    "/api/inventory/low-stock": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "Low stock alert notifications",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Medicines below reorder threshold" } },
      },
    },
    "/api/inventory/near-expiry": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "Near-expiry & expired batches alert",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "daysThreshold", in: "query", schema: { type: "integer", default: 30 } },
        ],
        responses: { 200: { description: "Batches nearing expiration" } },
      },
    },
    "/api/inventory/batch/{id}": {
      get: {
        tags: ["Inventory & Batches"],
        summary: "Get specific batch details",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Batch details" } },
      },
    },
    "/api/inventory/{id}": {
      patch: {
        tags: ["Inventory & Batches"],
        summary: "Update inventory batch metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateInventoryDto" },
            },
          },
        },
        responses: { 200: { description: "Inventory item updated" } },
      },
    },
  },
  schemas: {
    InwardStockDto: {
      type: "object",
      required: ["branchId", "productId", "quantity"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        productId: { type: "string", format: "uuid" },
        supplierId: { type: "string", format: "uuid" },
        batchNumber: { type: "string", example: "BX-2026-901" },
        barcode: { type: "string", example: "8941100523412" },
        mfgDate: { type: "string", format: "date", example: "2026-01-01" },
        expiryDate: { type: "string", format: "date", example: "2027-12-31" },
        receivingUnit: { type: "string", enum: ["CARTON", "BOX"], default: "CARTON" },
        boxesReceived: { type: "integer", example: 50 },
        quantity: { type: "integer", minimum: 1, example: 500 },
        purchasePrice: { type: "number", example: 1.8 },
        sellingPrice: { type: "number", example: 2.5 },
        shelfLocation: { type: "string", example: "Rack A / Shelf 2" },
        paidAmount: { type: "number", default: 0, example: 900 },
        notes: { type: "string" },
      },
    },
    AdjustStockDto: {
      type: "object",
      required: ["branchId", "productId", "quantity"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        productId: { type: "string", format: "uuid" },
        inventoryId: { type: "string", format: "uuid" },
        quantity: { type: "integer", example: -5, description: "Positive to add, negative to subtract" },
        type: { type: "string", enum: ["PURCHASE", "SALE", "ADJUSTMENT", "DAMAGE", "RETURN"], default: "ADJUSTMENT" },
        reason: { type: "string", example: "Physical damage during shelf cleaning" },
      },
    },
    AllocateStockDto: {
      type: "object",
      required: ["inventoryId", "quantity"],
      properties: {
        inventoryId: { type: "string", format: "uuid" },
        rack: { type: "string", example: "Rack A" },
        shelf: { type: "string", example: "Shelf 3" },
        bin: { type: "string", example: "Bin 04" },
        quantity: { type: "integer", minimum: 1, example: 100 },
      },
    },
    MoveStockDto: {
      type: "object",
      required: ["fromLocationId", "quantity"],
      properties: {
        fromLocationId: { type: "string", format: "uuid" },
        rack: { type: "string", example: "Rack B" },
        shelf: { type: "string", example: "Shelf 1" },
        quantity: { type: "integer", minimum: 1, example: 50 },
      },
    },
    RemoveExpiredDto: {
      type: "object",
      required: ["branchId", "inventoryId", "source", "quantity"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        inventoryId: { type: "string", format: "uuid" },
        source: { type: "string", enum: ["BULK", "LOCATION"] },
        quantity: { type: "integer", minimum: 1, example: 20 },
        reason: { type: "string", example: "Expired medicine disposed" },
      },
    },
    UpdateInventoryDto: {
      type: "object",
      properties: {
        batchNumber: { type: "string" },
        barcode: { type: "string" },
        expiryDate: { type: "string", format: "date" },
        shelfLocation: { type: "string" },
        purchasePrice: { type: "number" },
        sellingPrice: { type: "number" },
      },
    },
  },
};
