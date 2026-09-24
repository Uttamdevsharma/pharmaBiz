export const tenantSwagger = {
  paths: {
    "/api/tenant/profile": {
      get: {
        tags: ["Tenant"],
        summary: "Get current tenant pharmacy profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Tenant organization profile details" },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Tenant"],
        summary: "Update tenant pharmacy profile & branding",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTenantProfileDto" },
              example: {
                name: "Green Care Pharmacy Ltd",
                phone: "01712345678",
                address: "Plot 12, Road 4, Dhanmondi, Dhaka",
                logoUrl: "https://res.cloudinary.com/demo/image/upload/v1/logo.png",
              },
            },
          },
        },
        responses: {
          200: { description: "Tenant profile updated successfully" },
        },
      },
    },
    "/api/tenant/subscription": {
      get: {
        tags: ["Tenant"],
        summary: "Get tenant subscription info & limits",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Active plan, branch limits, staff limits, and status" },
        },
      },
    },
    "/api/tenant/usage": {
      get: {
        tags: ["Tenant"],
        summary: "Get current resource usage vs plan limits",
        description: "Returns branches created vs max branches, staff headcount vs max allowed, etc.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Current resource usage report" },
        },
      },
    },
  },
  schemas: {
    UpdateTenantProfileDto: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2, example: "Green Care Pharmacy Ltd" },
        email: { type: "string", format: "email", example: "info@greencare.com" },
        phone: { type: "string", example: "01712345678" },
        address: { type: "string", example: "Plot 12, Road 4, Dhanmondi, Dhaka" },
        logoUrl: { type: "string", format: "uri", example: "https://res.cloudinary.com/demo/logo.png" },
      },
    },
  },
};
