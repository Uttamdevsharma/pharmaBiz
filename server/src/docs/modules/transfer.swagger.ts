export const transferSwagger = {
  paths: {
    "/api/transfers": {
      get: {
        tags: ["Stock Transfers"],
        summary: "List inter-branch stock transfers",
        description: "Returns transfer requisitions and shipments with status filter (PENDING, IN_TRANSIT, RECEIVED, REJECTED).",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Source or destination branch UUID" },
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"] } },
          { name: "settlementStatus", in: "query", schema: { type: "string", enum: ["UNSETTLED", "PARTIAL", "SETTLED"] } },
        ],
        responses: { 200: { description: "List of transfers" } },
      },
      post: {
        tags: ["Stock Transfers"],
        summary: "Create and dispatch inter-branch transfer",
        description: "Transfers medicine stock from source branch to destination branch with courier details.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTransferDto" },
              example: {
                fromBranchId: "b1111111-1111-1111-1111-111111111111",
                toBranchId: "b2222222-2222-2222-2222-222222222222",
                courierName: "Sundarban Courier",
                trackingId: "SC-998822",
                notes: "Urgent restocking of insulin and analgesics",
                items: [
                  {
                    productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                    sentQuantity: 100,
                    costPrice: 2.0,
                  },
                ],
              },
            },
          },
        },
        responses: { 201: { description: "Transfer dispatched successfully" } },
      },
    },
    "/api/transfers/damaged-products": {
      get: {
        tags: ["Stock Transfers"],
        summary: "List transit damaged products report",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Damaged stock items recorded during receipt" } },
      },
    },
    "/api/transfers/{id}": {
      get: {
        tags: ["Stock Transfers"],
        summary: "Get transfer details & manifest",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Transfer details" } },
      },
    },
    "/api/transfers/{id}/receive": {
      post: {
        tags: ["Stock Transfers"],
        summary: "Receive shipment and acknowledge delivery",
        description: "Receives inventory at destination branch and flags any broken, damaged, or missing units.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ReceiveTransferDto" },
              example: {
                items: [
                  {
                    itemId: "item-uuid-1234",
                    receivedQuantity: 98,
                    damagedQuantity: 2,
                    missingQuantity: 0,
                    notes: "2 vials broken during transit",
                  },
                ],
                notes: "Shipment verified by Branch Manager",
              },
            },
          },
        },
        responses: { 200: { description: "Transfer received and added to branch inventory" } },
      },
    },
    "/api/transfers/{id}/settle": {
      post: {
        tags: ["Stock Transfers"],
        summary: "Settle transfer cost between branch accounts",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SettleTransferDto" },
              example: {
                sourceAccountId: "acc-dest-branch-uuid",
                destinationAccountId: "acc-src-branch-uuid",
                amount: 200,
                paymentMethod: "BANK",
              },
            },
          },
        },
        responses: { 200: { description: "Transfer settled" } },
      },
    },
    "/api/transfers/{id}/cancel": {
      post: {
        tags: ["Stock Transfers"],
        summary: "Cancel transfer and revert stock to source",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Transfer cancelled and stock refunded to origin" } },
      },
    },
  },
  schemas: {
    CreateTransferDto: {
      type: "object",
      required: ["fromBranchId", "toBranchId", "items"],
      properties: {
        fromBranchId: { type: "string", format: "uuid" },
        toBranchId: { type: "string", format: "uuid" },
        courierName: { type: "string", example: "Sundarban Courier" },
        trackingId: { type: "string", example: "SC-998822" },
        deliveryPersonName: { type: "string" },
        deliveryPersonContact: { type: "string" },
        notes: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["productId", "sentQuantity", "costPrice"],
            properties: {
              productId: { type: "string", format: "uuid" },
              inventoryId: { type: "string", format: "uuid" },
              batchNumber: { type: "string" },
              sentQuantity: { type: "integer", minimum: 1, example: 100 },
              costPrice: { type: "number", example: 2.0 },
            },
          },
        },
      },
    },
    ReceiveTransferDto: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["itemId", "receivedQuantity"],
            properties: {
              itemId: { type: "string", format: "uuid" },
              receivedQuantity: { type: "integer", minimum: 0, example: 98 },
              damagedQuantity: { type: "integer", default: 0, example: 2 },
              missingQuantity: { type: "integer", default: 0, example: 0 },
              notes: { type: "string" },
            },
          },
        },
        notes: { type: "string" },
      },
    },
    SettleTransferDto: {
      type: "object",
      required: ["sourceAccountId", "destinationAccountId", "amount"],
      properties: {
        sourceAccountId: { type: "string", format: "uuid" },
        destinationAccountId: { type: "string", format: "uuid" },
        amount: { type: "number", minimum: 0.01, example: 200 },
        paymentMethod: { type: "string", default: "CASH" },
        reference: { type: "string" },
      },
    },
  },
};
