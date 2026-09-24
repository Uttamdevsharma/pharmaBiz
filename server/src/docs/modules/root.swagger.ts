export const rootSwagger = {
  paths: {
    "/": {
      get: {
        tags: ["Root & Health"],
        summary: "API Health Check & Status",
        description: "Returns server status, running timestamp, and API version.",
        responses: {
          200: {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    name: { type: "string", example: "Multi-Tenant SaaS Pharmacy Management API" },
                    version: { type: "string", example: "1.0.0" },
                    status: { type: "string", example: "Healthy" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/payment/success": {
      post: {
        tags: ["Root & Health"],
        summary: "Gateway root payment success callback (POST)",
        responses: { 200: { description: "Payment handled" } },
      },
      get: {
        tags: ["Root & Health"],
        summary: "Gateway root payment success redirect (GET)",
        responses: { 302: { description: "Redirect to frontend" } },
      },
    },
    "/payment/fail": {
      post: {
        tags: ["Root & Health"],
        summary: "Gateway root payment fail callback (POST)",
        responses: { 200: { description: "Payment failure handled" } },
      },
      get: {
        tags: ["Root & Health"],
        summary: "Gateway root payment fail redirect (GET)",
        responses: { 302: { description: "Redirect to frontend" } },
      },
    },
    "/payment/cancel": {
      post: {
        tags: ["Root & Health"],
        summary: "Gateway root payment cancel callback (POST)",
        responses: { 200: { description: "Payment cancellation handled" } },
      },
      get: {
        tags: ["Root & Health"],
        summary: "Gateway root payment cancel redirect (GET)",
        responses: { 302: { description: "Redirect to frontend" } },
      },
    },
  },
};
