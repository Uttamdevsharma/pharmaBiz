export const paymentSwagger = {
  paths: {
    "/api/payments/initiate": {
      post: {
        tags: ["Payments"],
        summary: "Initiate SSLCommerz payment checkout",
        description: "Creates an SSLCommerz gateway session for subscription payment and returns the payment gateway redirect URL.",
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InitiatePaymentDto" },
              example: {
                subscriptionId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                customerName: "Dr. Rafiqul Islam",
                customerEmail: "rafiq@greencare.com",
                customerPhone: "01712345678",
                customerAddress: "Plot 12, Dhanmondi, Dhaka",
                customerCity: "Dhaka",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Gateway session created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        gatewayUrl: { type: "string", example: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=..." },
                        sessionkey: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid subscription or payment gateway error" },
        },
      },
    },
    "/api/payments/history": {
      get: {
        tags: ["Payments"],
        summary: "Get tenant payment transactions history",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of payment transactions" },
        },
      },
    },
    "/api/payments/{id}/validate": {
      get: {
        tags: ["Payments"],
        summary: "Validate payment status with gateway",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Payment Transaction UUID or Session ID" },
        ],
        responses: {
          200: { description: "Validation result" },
        },
      },
    },
    "/api/payments/sslcommerz/success": {
      post: {
        tags: ["Payments"],
        summary: "SSLCommerz success IPN/callback endpoint (POST)",
        description: "Called by SSLCommerz upon customer completing successful payment.",
        responses: {
          200: { description: "Payment verified and subscription activated" },
        },
      },
      get: {
        tags: ["Payments"],
        summary: "SSLCommerz success redirect endpoint (GET)",
        responses: { 302: { description: "Redirect to client payment confirmation" } },
      },
    },
    "/api/payments/sslcommerz/fail": {
      post: {
        tags: ["Payments"],
        summary: "SSLCommerz failed payment webhook (POST)",
        responses: { 200: { description: "Payment marked failed" } },
      },
      get: {
        tags: ["Payments"],
        summary: "SSLCommerz failed payment redirect (GET)",
        responses: { 302: { description: "Redirect to client fail page" } },
      },
    },
    "/api/payments/sslcommerz/cancel": {
      post: {
        tags: ["Payments"],
        summary: "SSLCommerz cancelled payment webhook (POST)",
        responses: { 200: { description: "Payment marked cancelled" } },
      },
      get: {
        tags: ["Payments"],
        summary: "SSLCommerz cancelled payment redirect (GET)",
        responses: { 302: { description: "Redirect to client cancel page" } },
      },
    },
    "/api/payments/sslcommerz/ipn": {
      post: {
        tags: ["Payments"],
        summary: "SSLCommerz Instant Payment Notification (IPN)",
        description: "Backend-to-backend automated IPN validator for async transaction verification.",
        responses: { 200: { description: "IPN processed" } },
      },
    },
  },
  schemas: {
    InitiatePaymentDto: {
      type: "object",
      required: ["subscriptionId"],
      properties: {
        subscriptionId: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
        customerName: { type: "string", example: "Dr. Rafiqul Islam" },
        customerEmail: { type: "string", format: "email", example: "rafiq@greencare.com" },
        customerPhone: { type: "string", example: "01712345678" },
        customerAddress: { type: "string", example: "Plot 12, Dhanmondi, Dhaka" },
        customerCity: { type: "string", example: "Dhaka" },
      },
    },
  },
};
