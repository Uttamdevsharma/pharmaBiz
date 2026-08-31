import { z } from "zod";

export const initiatePaymentSchema = z.object({
  subscriptionId: z.string().uuid("Invalid subscription ID format"),
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerCity: z.string().optional(),
});

export const sslcommerzCallbackSchema = z.object({
  tran_id: z.string(),
  val_id: z.string().optional(),
  amount: z.string().optional(),
  card_type: z.string().optional(),
  store_amount: z.string().optional(),
  bank_tran_id: z.string().optional(),
  status: z.string().optional(),
  tran_date: z.string().optional(),
  currency: z.string().optional(),
  card_issuer: z.string().optional(),
  card_brand: z.string().optional(),
  card_sub_brand: z.string().optional(),
  card_issuer_country: z.string().optional(),
  error: z.string().optional(),
  value_a: z.string().optional(), // tenantId
  value_b: z.string().optional(), // subscriptionId
  value_c: z.string().optional(), // action
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type SSLCommerzCallbackInput = z.infer<typeof sslcommerzCallbackSchema>;
