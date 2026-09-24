export const locationSwagger = {
  paths: {
    "/api/locations": {
      get: {
        tags: ["Location & Rack Management"],
        summary: "Get branch storage racks and location hierarchy",
        security: [{ bearerAuth: [] }, { branchHeader: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "includeInactive", in: "query", schema: { type: "boolean" } },
        ],
        responses: { 200: { description: "Racks, shelves, and bins hierarchy" } },
      },
    },
    "/api/locations/batch/{inventoryId}": {
      get: {
        tags: ["Location & Rack Management"],
        summary: "Get physical storage rack locations for a batch",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "inventoryId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Batch locations" } },
      },
    },
    "/api/locations/quick-rack": {
      post: {
        tags: ["Location & Rack Management"],
        summary: "Quick auto-generate rack with shelves and bins",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuickCreateRackDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                name: "Rack A",
                numberOfShelves: 4,
                binsPerShelf: 6,
              },
            },
          },
        },
        responses: { 201: { description: "Rack auto-created with shelves and bins" } },
      },
    },
    "/api/locations/racks": {
      post: {
        tags: ["Location & Rack Management"],
        summary: "Create single rack",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  branchId: { type: "string", format: "uuid" },
                  name: { type: "string", example: "Rack B" },
                  zone: { type: "string", example: "Front Sales Floor" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Rack created" } },
      },
    },
    "/api/locations/racks/{id}": {
      patch: {
        tags: ["Location & Rack Management"],
        summary: "Update rack name or zone",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Rack updated" } },
      },
      delete: {
        tags: ["Location & Rack Management"],
        summary: "Delete rack",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Rack deleted" } },
      },
    },
    "/api/locations/shelves": {
      post: {
        tags: ["Location & Rack Management"],
        summary: "Create shelf under a rack",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rackId", "name"],
                properties: {
                  rackId: { type: "string", format: "uuid" },
                  name: { type: "string", example: "Shelf 1" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Shelf created" } },
      },
    },
    "/api/locations/shelves/{id}": {
      patch: {
        tags: ["Location & Rack Management"],
        summary: "Update shelf",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Shelf updated" } },
      },
      delete: {
        tags: ["Location & Rack Management"],
        summary: "Delete shelf",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Shelf deleted" } },
      },
    },
    "/api/locations/bins": {
      post: {
        tags: ["Location & Rack Management"],
        summary: "Create storage bin under a shelf",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shelfId", "name"],
                properties: {
                  shelfId: { type: "string", format: "uuid" },
                  name: { type: "string", example: "Bin 01" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Bin created" } },
      },
    },
    "/api/locations/bins/{id}": {
      patch: {
        tags: ["Location & Rack Management"],
        summary: "Update bin",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Bin updated" } },
      },
      delete: {
        tags: ["Location & Rack Management"],
        summary: "Delete bin",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Bin deleted" } },
      },
    },
  },
  schemas: {
    QuickCreateRackDto: {
      type: "object",
      required: ["name"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        name: { type: "string", example: "Rack A" },
        numberOfShelves: { type: "integer", default: 4, example: 4 },
        binsPerShelf: { type: "integer", default: 6, example: 6 },
      },
    },
  },
};
