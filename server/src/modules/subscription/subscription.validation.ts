import { z } from "zod";

export const subscribeSchema = z.object({
  planId: z.string().uuid("Invalid plan ID format"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  autoRenew: z.boolean().default(false),
});

export const changePlanSchema = z.object({
  newPlanId: z.string().uuid("Invalid new plan ID format"),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
