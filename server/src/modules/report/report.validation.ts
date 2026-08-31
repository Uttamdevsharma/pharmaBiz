import { z } from "zod";

export const reportDateRangeSchema = z.object({
  branchId: z.string().uuid().optional(),
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
