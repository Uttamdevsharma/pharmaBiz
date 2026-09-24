export const subscriptionSwagger = {
  paths: {
    "/api/subscriptions/plans": {
      get: {
        tags: ["Subscriptions"],
        summary: "List public active plans",
        description: "Returns all active subscription plans available for signup or upgrades.",
        responses: {
          200: { description: "Active plans list" },
        },
      },
    },
    "/api/subscriptions/plans/{id}": {
      get: {
        tags: ["Subscriptions"],
        summary: "Get plan details by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Plan details" },
          404: { description: "Plan not found" },
        },
      },
    },
    "/api/subscriptions/current": {
      get: {
        tags: ["Subscriptions"],
        summary: "Get current tenant active subscription",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Current active subscription with expiry dates and limits" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/subscriptions/history": {
      get: {
        tags: ["Subscriptions"],
        summary: "Get tenant billing & subscription history",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Historical subscription records and invoices" },
        },
      },
    },
    "/api/subscriptions/subscribe": {
      post: {
        tags: ["Subscriptions"],
        summary: "Subscribe to a plan",
        description: "Initializes a subscription for the tenant and returns pending subscription record to pay.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscribeDto" },
              example: {
                planId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                billingCycle: "MONTHLY",
                autoRenew: false,
              },
            },
          },
        },
        responses: {
          200: { description: "Subscription initiated" },
        },
      },
    },
    "/api/subscriptions/change-plan": {
      post: {
        tags: ["Subscriptions"],
        summary: "Upgrade or downgrade current plan",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePlanDto" },
              example: {
                newPlanId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
              },
            },
          },
        },
        responses: {
          200: { description: "Plan changed successfully" },
        },
      },
    },
    "/api/subscriptions/renew": {
      post: {
        tags: ["Subscriptions"],
        summary: "Renew current subscription",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Renewal invoice created for payment" },
        },
      },
    },
    "/api/subscriptions/cancel": {
      post: {
        tags: ["Subscriptions"],
        summary: "Cancel current subscription",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Migrating to new branch location" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Subscription cancelled" },
        },
      },
    },
    "/api/subscriptions/check-expiry-reminders": {
      post: {
        tags: ["Subscriptions"],
        summary: "Manually trigger expiry check & notifications",
        description: "Reserved for Super Admin / CTO to force check upcoming expiration reminders.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Expiry checks executed" },
        },
      },
    },
  },
  schemas: {
    SubscribeDto: {
      type: "object",
      required: ["planId"],
      properties: {
        planId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
        billingCycle: { type: "string", enum: ["MONTHLY", "YEARLY"], default: "MONTHLY" },
        autoRenew: { type: "boolean", default: false },
      },
    },
    ChangePlanDto: {
      type: "object",
      required: ["newPlanId"],
      properties: {
        newPlanId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
      },
    },
  },
};
