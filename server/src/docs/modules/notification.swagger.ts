export const notificationSwagger = {
  paths: {
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        description: "Returns notifications for the user with filter for read/unread and notification type.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["LOW_STOCK", "EXPIRY", "SYNC_FAILURE", "SYSTEM"] } },
          { name: "isRead", in: "query", schema: { type: "boolean" } },
        ],
        responses: { 200: { description: "List of notifications" } },
      },
    },
    "/api/notifications/low-stock": {
      get: {
        tags: ["Notifications"],
        summary: "Get low stock notifications",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Low stock alert notifications" } },
      },
    },
    "/api/notifications/expiry": {
      get: {
        tags: ["Notifications"],
        summary: "Get medicine expiry alert notifications",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Expiry alert notifications" } },
      },
    },
    "/api/notifications/sync-failures": {
      get: {
        tags: ["Notifications"],
        summary: "Get offline POS sync failure notifications",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Sync failure alerts" } },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all user notifications as read",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "All marked as read" } },
      },
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark single notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Notification marked read" } },
      },
    },
  },
};
