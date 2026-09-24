export const productSwagger = {
  paths: {
    "/api/products": {
      get: {
        tags: ["Products & Catalog"],
        summary: "List medicines & pharmaceutical products",
        description: "Returns paginated list of catalog products with brand, category, dosage form, and stock status.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by brand name, generic name, or barcode" },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "brandId", in: "query", schema: { type: "string" } },
          { name: "productType", in: "query", schema: { type: "string", enum: ["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"] } },
          { name: "isControlled", in: "query", schema: { type: "boolean" } },
          { name: "requiresPrescription", in: "query", schema: { type: "boolean" } },
          { name: "branchId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Paginated product list" },
        },
      },
      post: {
        tags: ["Products & Catalog"],
        summary: "Create a new medicine / product",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProductDto" },
              example: {
                name: "Napa Extra 500mg/65mg",
                genericName: "Paracetamol + Caffeine",
                sku: "NAPA-EXT-500",
                barcode: "8941100523412",
                basePrice: 2.5,
                unit: "tablet",
                productType: "MEDICINE",
                defaultPackType: "BOX",
                stripsPerBox: 20,
                tabletsPerStrip: 10,
                minStockAlert: 50,
                requiresPrescription: false,
              },
            },
          },
        },
        responses: {
          201: { description: "Product created successfully" },
        },
      },
    },
    "/api/products/bulk": {
      post: {
        tags: ["Products & Catalog"],
        summary: "Bulk import products",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: { $ref: "#/components/schemas/CreateProductDto" },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Bulk import completed" } },
      },
    },
    "/api/products/barcode/{barcode}": {
      get: {
        tags: ["Products & Catalog"],
        summary: "Scan / Lookup product by barcode",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "barcode", in: "path", required: true, schema: { type: "string" }, example: "8941100523412" }],
        responses: {
          200: { description: "Product matching barcode" },
          404: { description: "Barcode not found" },
        },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Products & Catalog"],
        summary: "Get product details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Product details" } },
      },
      patch: {
        tags: ["Products & Catalog"],
        summary: "Update product metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProductDto" },
            },
          },
        },
        responses: { 200: { description: "Product updated" } },
      },
      delete: {
        tags: ["Products & Catalog"],
        summary: "Delete product",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Product deleted" } },
      },
    },
    "/api/products/{id}/price": {
      patch: {
        tags: ["Products & Catalog"],
        summary: "Update base MRP / selling price",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { basePrice: { type: "number", example: 3.0 } },
              },
            },
          },
        },
        responses: { 200: { description: "Price updated" } },
      },
    },
    "/api/products/{id}/branch-price": {
      post: {
        tags: ["Products & Catalog"],
        summary: "Set custom price override for a specific branch",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["branchId", "price"],
                properties: {
                  branchId: { type: "string", format: "uuid" },
                  price: { type: "number", example: 3.5 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Branch override price set" } },
      },
    },
    "/api/products/{id}/branch-price/{branchId}": {
      delete: {
        tags: ["Products & Catalog"],
        summary: "Remove branch price override",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Override removed" } },
      },
    },
    "/api/products/categories": {
      get: {
        tags: ["Products & Catalog"],
        summary: "List product categories",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Categories list" } },
      },
      post: {
        tags: ["Products & Catalog"],
        summary: "Create product category",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCategoryDto" },
              example: {
                name: "Antibiotics",
                productType: "MEDICINE",
                description: "Antibacterial medicines and cephalosporins",
              },
            },
          },
        },
        responses: { 201: { description: "Category created" } },
      },
    },
    "/api/products/categories/{id}": {
      patch: {
        tags: ["Products & Catalog"],
        summary: "Update category",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCategoryDto" },
            },
          },
        },
        responses: { 200: { description: "Category updated" } },
      },
      delete: {
        tags: ["Products & Catalog"],
        summary: "Delete category",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Category deleted" } },
      },
    },
    "/api/products/brands": {
      get: {
        tags: ["Products & Catalog"],
        summary: "List medicine brands / manufacturers",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Brands list" } },
      },
      post: {
        tags: ["Products & Catalog"],
        summary: "Create brand",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBrandDto" },
              example: { name: "Square Pharmaceuticals PLC", description: "Leading pharmaceutical manufacturer" },
            },
          },
        },
        responses: { 201: { description: "Brand created" } },
      },
    },
    "/api/products/brands/{id}": {
      patch: {
        tags: ["Products & Catalog"],
        summary: "Update brand",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBrandDto" } } },
        },
        responses: { 200: { description: "Brand updated" } },
      },
      delete: {
        tags: ["Products & Catalog"],
        summary: "Delete brand",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Brand deleted" } },
      },
    },
    "/api/products/units": {
      get: {
        tags: ["Products & Catalog"],
        summary: "List measurement units",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Units list" } },
      },
      post: {
        tags: ["Products & Catalog"],
        summary: "Create measurement unit",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUnitDto" },
              example: { name: "Tablet", symbol: "tab", productType: "MEDICINE" },
            },
          },
        },
        responses: { 201: { description: "Unit created" } },
      },
    },
  },
  schemas: {
    CreateProductDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 2, example: "Napa Extra 500mg/65mg" },
        genericName: { type: "string", example: "Paracetamol + Caffeine" },
        sku: { type: "string", example: "NAPA-EXT-500" },
        barcode: { type: "string", example: "8941100523412" },
        basePrice: { type: "number", minimum: 0, default: 0, example: 2.5 },
        category: { type: "string", example: "Analgesic" },
        categoryId: { type: "string", format: "uuid" },
        brandId: { type: "string", format: "uuid" },
        unitId: { type: "string", format: "uuid" },
        productType: { type: "string", enum: ["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"], default: "MEDICINE" },
        unit: { type: "string", default: "piece", example: "tablet" },
        defaultPackType: { type: "string", default: "BOX" },
        stripsPerBox: { type: "integer", example: 20 },
        tabletsPerStrip: { type: "integer", example: 10 },
        minStockAlert: { type: "integer", default: 10, example: 50 },
        requiresPrescription: { type: "boolean", default: false },
        isControlled: { type: "boolean", default: false },
      },
    },
    CreateCategoryDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 2, example: "Antibiotics" },
        productType: { type: "string", enum: ["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"] },
        description: { type: "string" },
        isActive: { type: "boolean", default: true },
      },
    },
    CreateBrandDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 2, example: "Square Pharmaceuticals PLC" },
        description: { type: "string" },
      },
    },
    CreateUnitDto: {
      type: "object",
      required: ["name", "symbol"],
      properties: {
        name: { type: "string", example: "Tablet" },
        symbol: { type: "string", example: "tab" },
        productType: { type: "string", enum: ["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"] },
      },
    },
  },
};
