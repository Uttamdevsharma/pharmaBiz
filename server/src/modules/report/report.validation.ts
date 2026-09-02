import { z } from "zod";

export const reportDateRangeSchema = z.object({
  branchId: z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" || v === "all" ? undefined : v)),
  userId: z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" || v === "all" ? undefined : v)),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "ALL"]).optional().transform(v => (v === "ALL" ? undefined : v)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const vatMisReportSchema = z.object({
  branchId: z.string().uuid().optional(),
  month: z.string().optional(), // YYYY-MM
  year: z.string().optional().transform(v => (v ? parseInt(v, 10) : new Date().getFullYear())),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ReportDateRangeQuery = z.infer<typeof reportDateRangeSchema>;
export type VatMisReportQuery = z.infer<typeof vatMisReportSchema>;
