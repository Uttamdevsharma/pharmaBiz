export const supplierSwagger = {
  paths: {
    "/api/suppliers": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "List medicine distributors & suppliers",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Suppliers list" } },
      },
      post: {
        tags: ["Suppliers & Purchases"],
        summary: "Register new supplier / distributor",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSupplierDto" },
              example: {
                name: "Square Pharma Distribution Hub",
                company: "Square Pharmaceuticals PLC",
                phone: "01755112233",
                email: "distribution@squarepharma.com",
                address: "Tejgaon I/A, Dhaka",
                contacts: [
                  {
                    name: "Mr. Zahid",
                    phone: "01755112244",
                    designation: "Territory Sales Executive",
                  },
                ],
              },
            },
          },
        },
        responses: { 201: { description: "Supplier registered successfully" } },
      },
    },
    "/api/suppliers/purchases/list": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "List supplier purchase orders & invoices",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "supplierId", in: "query", schema: { type: "string" } },
          { name: "paymentStatus", in: "query", schema: { type: "string", enum: ["PAID", "PARTIAL", "DUE"] } },
        ],
        responses: { 200: { description: "Purchase order history" } },
      },
    },
    "/api/suppliers/purchases": {
      post: {
        tags: ["Suppliers & Purchases"],
        summary: "Record purchase order & inward stock",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePurchaseDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                supplierId: "sup-uuid-1234",
                invoiceNo: "INV-SQ-99881",
                paidAmount: 5000,
                paymentMethod: "BANK",
                items: [
                  {
                    productId: "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
                    batchNumber: "B-2026-10",
                    expiryDate: "2027-10-31",
                    quantity: 2000,
                    unitPurchasePrice: 2.0,
                    unitSellingPrice: 2.8,
                  },
                ],
              },
            },
          },
        },
        responses: { 201: { description: "Purchase recorded" } },
      },
    },
    "/api/suppliers/payments/list": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "List payments made to suppliers",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Supplier payment ledger" } },
      },
    },
    "/api/suppliers/due-summary": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "Supplier outstanding payables & dues summary",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Outstanding debt by supplier" } },
      },
    },
    "/api/suppliers/{id}": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "Get supplier details & contact representatives",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Supplier profile" } },
      },
      patch: {
        tags: ["Suppliers & Purchases"],
        summary: "Update supplier profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSupplierDto" } } },
        },
        responses: { 200: { description: "Supplier updated" } },
      },
      delete: {
        tags: ["Suppliers & Purchases"],
        summary: "Delete supplier",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Supplier deleted" } },
      },
    },
    "/api/suppliers/{id}/payments": {
      post: {
        tags: ["Suppliers & Purchases"],
        summary: "Disburse due payment to supplier",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecordSupplierPaymentDto" },
              example: {
                amount: 3500,
                financialAccountId: "acc-bank-uuid",
                paymentMethod: "CHEQUE",
                reference: "CHQ-882201",
              },
            },
          },
        },
        responses: { 200: { description: "Payment disbursed and supplier balance updated" } },
      },
    },
    "/api/suppliers/{id}/purchases": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "List all purchases for this specific supplier",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Purchases list" } },
      },
    },
    "/api/suppliers/{id}/contacts": {
      get: {
        tags: ["Suppliers & Purchases"],
        summary: "List contact persons under supplier",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Contact persons" } },
      },
      post: {
        tags: ["Suppliers & Purchases"],
        summary: "Add contact person to supplier",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "phone"],
                properties: {
                  name: { type: "string", example: "Kabir Hossain" },
                  phone: { type: "string", example: "01788776655" },
                  email: { type: "string", format: "email" },
                  designation: { type: "string", example: "Order Booker" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Contact added" } },
      },
    },
    "/api/suppliers/{id}/contacts/{contactId}": {
      patch: {
        tags: ["Suppliers & Purchases"],
        summary: "Update supplier contact person",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "contactId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Contact updated" } },
      },
      delete: {
        tags: ["Suppliers & Purchases"],
        summary: "Delete supplier contact",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "contactId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Contact deleted" } },
      },
    },
  },
  schemas: {
    CreateSupplierDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 2, example: "Square Pharma Distribution Hub" },
        company: { type: "string", example: "Square Pharmaceuticals PLC" },
        phone: { type: "string", example: "01755112233" },
        email: { type: "string", format: "email", example: "distribution@squarepharma.com" },
        address: { type: "string", example: "Tejgaon I/A, Dhaka" },
        contacts: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "phone"],
            properties: {
              name: { type: "string", example: "Mr. Zahid" },
              phone: { type: "string", example: "01755112244" },
              email: { type: "string", format: "email" },
              designation: { type: "string", example: "Territory Sales Executive" },
            },
          },
        },
      },
    },
    CreatePurchaseDto: {
      type: "object",
      required: ["branchId", "items"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        supplierId: { type: "string", format: "uuid" },
        invoiceNo: { type: "string", example: "INV-SQ-99881" },
        paidAmount: { type: "number", default: 0, example: 5000 },
        paymentMethod: { type: "string", default: "CASH" },
        financialAccountId: { type: "string", format: "uuid" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["productId", "quantity", "unitPurchasePrice", "unitSellingPrice"],
            properties: {
              productId: { type: "string", format: "uuid" },
              batchNumber: { type: "string", example: "B-2026-10" },
              expiryDate: { type: "string", format: "date", example: "2027-10-31" },
              quantity: { type: "integer", minimum: 1, example: 2000 },
              unitPurchasePrice: { type: "number", example: 2.0 },
              unitSellingPrice: { type: "number", example: 2.8 },
            },
          },
        },
      },
    },
    RecordSupplierPaymentDto: {
      type: "object",
      required: ["amount", "financialAccountId"],
      properties: {
        amount: { type: "number", minimum: 0.01, example: 3500 },
        financialAccountId: { type: "string", format: "uuid" },
        paymentMethod: { type: "string", example: "CHEQUE" },
        reference: { type: "string", example: "CHQ-882201" },
        notes: { type: "string" },
      },
    },
  },
};
