import { z } from "zod";

export const CreateNoticeSchema = z.object({
  title: z.string().min(1, "Notice title is required").max(255),
  content: z.string().min(1, "Notice content is required"),
  type: z.enum(["ANNOUNCEMENT", "MAINTENANCE", "FEATURE", "UPDATE"]).default("ANNOUNCEMENT"),
  badge_text: z.string().max(50).nullable().optional(),
  pinned: z.boolean().default(false),
  is_published: z.boolean().default(true),
  show_banner: z.boolean().default(true),
  banner_duration_days: z.number().int().min(1).max(365).default(7),
  target_type: z.enum(["ALL", "SPECIFIC"]).default("ALL"),
  target_business_ids: z.array(z.string()).nullable().optional(),
});

export const UpdateNoticeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(["ANNOUNCEMENT", "MAINTENANCE", "FEATURE", "UPDATE"]).optional(),
  badge_text: z.string().max(50).nullable().optional(),
  pinned: z.boolean().optional(),
  is_published: z.boolean().optional(),
  show_banner: z.boolean().optional(),
  banner_duration_days: z.number().int().min(1).max(365).optional(),
  target_type: z.enum(["ALL", "SPECIFIC"]).optional(),
  target_business_ids: z.array(z.string()).nullable().optional(),
});

export const MarkNoticeReadSchema = z.object({
  notice_id: z.number().int().positive(),
});
