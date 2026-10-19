import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(255),
  message: z.string().trim().min(5, "Message must be at least 5 characters"),
  category: z.enum(["BUG", "FEATURE", "QUERY"]).default("QUERY"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  attachments: z.any().optional(),
  branchId: z.string().optional(),
});

export const createReplySchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty"),
  attachments: z.any().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["PENDING", "CHECKING", "WORKING", "TESTING", "SOLVED", "CLOSED"]),
});
