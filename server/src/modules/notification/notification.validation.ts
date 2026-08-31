import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
  type: z.enum(["LOW_STOCK", "EXPIRY", "SYNC_FAILURE", "SYSTEM"]).optional(),
  isRead: z.string().optional().transform(v => (v === "true" ? true : v === "false" ? false : undefined)),
  branchId: z.string().uuid().optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
