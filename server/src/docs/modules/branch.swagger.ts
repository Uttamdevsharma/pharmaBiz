export const branchSwagger = {
  paths: {
    "/api/branches": {
      get: {
        tags: ["Branches"],
        summary: "List all branches of current tenant",
        description: "Returns branches configured under this pharmacy organization.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of branches" },
        },
      },
      post: {
        tags: ["Branches"],
        summary: "Create a new branch",
        description: "Enforces plan branch limit before creating a new physical pharmacy branch.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateBranchDto" },
              example: {
                name: "Uttara Sector 7 Branch",
                location: "House 24, Road 1, Sector 7, Uttara, Dhaka",
                phone: "01798765432",
                email: "uttara@greencare.com",
              },
            },
          },
        },
        responses: {
          201: { description: "Branch created successfully" },
          403: { description: "Plan limit exceeded or insufficient permissions" },
        },
      },
    },
    "/api/branches/{id}": {
      get: {
        tags: ["Branches"],
        summary: "Get branch details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Branch UUID" },
        ],
        responses: {
          200: { description: "Branch details" },
          404: { description: "Branch not found" },
        },
      },
      patch: {
        tags: ["Branches"],
        summary: "Update branch details or status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Branch UUID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateBranchDto" },
              example: {
                name: "Uttara Flagship Branch",
                phone: "01711223344",
                isActive: true,
              },
            },
          },
        },
        responses: {
          200: { description: "Branch updated successfully" },
        },
      },
      delete: {
        tags: ["Branches"],
        summary: "Delete branch",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Branch UUID" },
        ],
        responses: {
          200: { description: "Branch deleted" },
        },
      },
    },
  },
  schemas: {
    CreateBranchDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 2, example: "Uttara Sector 7 Branch" },
        location: { type: "string", example: "House 24, Road 1, Sector 7, Uttara, Dhaka" },
        phone: { type: "string", example: "01798765432" },
        email: { type: "string", format: "email", example: "uttara@greencare.com" },
      },
    },
    UpdateBranchDto: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2, example: "Uttara Flagship Branch" },
        location: { type: "string" },
        phone: { type: "string" },
        email: { type: "string", format: "email" },
        isActive: { type: "boolean" },
      },
    },
  },
};
