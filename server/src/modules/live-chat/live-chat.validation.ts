import { z } from "zod";

export const createSessionSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(5, "Phone number is required"),
  department: z.enum(["SALES", "TECH_SUPPORT", "BILLING", "GENERAL"]).default("GENERAL"),
  question: z.string().trim().min(2, "Question or message cannot be empty"),
  current_url: z.string().optional(),
  user_agent: z.string().optional(),
});

export const visitorMessageSchema = z.object({
  sessionToken: z.string().min(5, "Session token is required"),
  message: z.string().trim().min(1, "Message cannot be empty"),
});

export const adminReplySchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty"),
});

export const updateStatusSchema = z.object({
  status: z.enum(["WAITING", "ACTIVE", "RESOLVED", "CLOSED"]),
});
