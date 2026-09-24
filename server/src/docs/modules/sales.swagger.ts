export const salesSwagger = {
  paths: {
    "/api/sales": {
      get: {
        tags: ["Sales & POS"],
        summary: "List sales transactions & invoices",
        description: "Returns paginated sales history with filter options for branch, payment method, cashier, and date range.",
        security: [{ bearerAuth: [] }, { branchHeader: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["COMPLETED", "REFUNDED", "VOIDED"] } },
          { name: "paymentMethod", in: "query", schema: { type: "string", enum: ["CASH", "BKASH", "NAGAD", "BANK", "CARD"] } },
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Invoice number or customer name/phone" },
        ],
        responses: { 200: { description: "List of sales" } },
      },
      post: {
        tags: ["Sales & POS"],
        summary: "POS Checkout / Create sale transaction",
        description: "Executes Point-of-Sale billing, deducts inventory batches using FEFO, calculates VAT and discounts, and generates receipt.",
        security: [{ bearerAuth: [] }, { branchHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSaleDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                customerName: "Mohammad Ali",
                customerPhone: "01711998877",
                paymentMethod: "CASH",
                discount: 10,
                discountType: "FIXED",
                tax: 5,
                items: [
                  {
                    productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                    quantity: 2,
                    unitType: "STRIP",
                    unitPrice: 25.0,
                  },
                ],
              },
            },
          },
        },
        responses: { 201: { description: "Sale completed and receipt invoice created" } },
      },
    },
    "/api/sales/customers": {
      get: {
        tags: ["Sales & POS"],
        summary: "List customer directory & purchase history",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Customer list with loyalty & purchase stats" } },
      },
    },
    "/api/sales/{id}": {
      get: {
        tags: ["Sales & POS"],
        summary: "Get sale details & line items",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Sale invoice details" } },
      },
    },
    "/api/sales/{id}/receipt": {
      get: {
        tags: ["Sales & POS"],
        summary: "Get thermal POS receipt data / printable layout",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Formatted receipt structure" } },
      },
    },
    "/api/sales/{id}/refund": {
      post: {
        tags: ["Sales & POS"],
        summary: "Process sale refund & restock items",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefundSaleDto" },
              example: {
                reason: "Patient prescribed alternative medication by doctor",
                managerId: "mgr-uuid-1234",
              },
            },
          },
        },
        responses: { 200: { description: "Refund issued" } },
      },
    },
    "/api/sales/{id}/void": {
      post: {
        tags: ["Sales & POS"],
        summary: "Void mistakenly created POS invoice",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefundSaleDto" },
              example: {
                reason: "Wrong item selected during checkout",
                managerId: "mgr-uuid-1234",
              },
            },
          },
        },
        responses: { 200: { description: "Sale voided" } },
      },
    },
  },
  schemas: {
    CreateSaleDto: {
      type: "object",
      required: ["branchId", "items"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        customerName: { type: "string", example: "Mohammad Ali" },
        customerPhone: { type: "string", example: "01711998877" },
        customerEmail: { type: "string", format: "email" },
        paymentMethod: { type: "string", enum: ["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"], default: "CASH" },
        financialAccountId: { type: "string", format: "uuid" },
        transactionRef: { type: "string" },
        discount: { type: "number", default: 0, example: 10 },
        discountType: { type: "string", enum: ["FIXED", "PERCENT"], default: "FIXED" },
        tax: { type: "number", default: 0, example: 5 },
        notes: { type: "string" },
        prescriptionRef: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["productId", "quantity"],
            properties: {
              productId: { type: "string", format: "uuid" },
              inventoryId: { type: "string", format: "uuid" },
              batchNumber: { type: "string" },
              unitType: { type: "string", default: "PIECE", example: "STRIP" },
              quantity: { type: "integer", minimum: 1, example: 2 },
              unitPrice: { type: "number", example: 25.0 },
            },
          },
        },
      },
    },
    RefundSaleDto: {
      type: "object",
      required: ["reason", "managerId"],
      properties: {
        reason: { type: "string", example: "Patient returned unopened medicine" },
        managerId: { type: "string", format: "uuid", example: "mgr-uuid-1234" },
      },
    },
  },
};
