export const settingsSwagger = {
  paths: {
    "/api/settings/public": {
      get: {
        tags: ["Settings"],
        summary: "Get public platform settings & landing page content",
        description: "Returns marketing site branding, hero banners, feature lists, pricing metadata, and contact information.",
        responses: { 200: { description: "Public landing page configuration" } },
      },
    },
    "/api/settings/admin": {
      get: {
        tags: ["Settings"],
        summary: "Get admin platform settings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Platform configuration" } },
      },
      patch: {
        tags: ["Settings"],
        summary: "Update platform CMS settings (Super Admin, CTO)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePlatformSettingsDto" },
              example: {
                siteName: "PharmaBiz Enterprise",
                primaryColor: "#059669",
              },
            },
          },
        },
        responses: { 200: { description: "Platform settings updated" } },
      },
    },
    "/api/settings/vat": {
      get: {
        tags: ["Settings"],
        summary: "Get pharmacy VAT & tax configurations",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "VAT configuration" } },
      },
      put: {
        tags: ["Settings"],
        summary: "Update pharmacy VAT rates",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  vatRate: { type: "number", example: 5.0 },
                  isVatInclusive: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: "VAT settings updated" } },
      },
    },
    "/api/settings/pharmacy": {
      get: {
        tags: ["Settings"],
        summary: "Get pharmacy receipt & print settings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Pharmacy custom settings" } },
      },
      put: {
        tags: ["Settings"],
        summary: "Update pharmacy receipt notes, terms, and footer message",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  receiptFooter: { type: "string", example: "Thank you for shopping with Green Care Pharmacy!" },
                  returnPolicyDays: { type: "integer", example: 7 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Pharmacy settings updated" } },
      },
    },
  },
  schemas: {
    UpdatePlatformSettingsDto: {
      type: "object",
      properties: {
        siteName: { type: "string", example: "PharmaBiz Enterprise" },
        logoUrl: { type: "string" },
        primaryColor: { type: "string", example: "#059669" },
        hero: {
          type: "object",
          properties: {
            title: { type: "string", example: "Modern Multi-Branch Pharmacy Management" },
            subtitle: { type: "string" },
          },
        },
      },
    },
  },
};
