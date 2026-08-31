import { z } from "zod";

export const updatePlatformSettingsSchema = z.object({
  siteName: z.string().min(2).optional(),
  logoUrl: z.string().optional(),
  logoPublicId: z.string().optional(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid HEX color format").optional(),
  hero: z
    .object({
      badge: z.string().optional(),
      title: z.string().min(3).optional(),
      subtitle: z.string().optional(),
      ctaPrimaryText: z.string().optional(),
      ctaSecondaryText: z.string().optional(),
    })
    .optional(),
  features: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        description: z.string(),
        icon: z.string().optional(),
      })
    )
    .optional(),
  howItWorks: z
    .array(
      z.object({
        step: z.number(),
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      supportHours: z.string().optional(),
    })
    .optional(),
  about: z
    .object({
      headline: z.string().optional(),
      description: z.string().optional(),
      stats: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    })
    .optional(),
});

export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;
