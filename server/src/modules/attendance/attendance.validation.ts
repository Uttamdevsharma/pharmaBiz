import { z } from "zod";

export const setBranchOffDayConfigSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  weeklyOffDays: z.array(z.string()).min(1, "At least one weekly off-day must be selected"),
  customOffDates: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
});

export const attendanceItemSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "PAID_LEAVE", "UNPAID_LEAVE", "OFF_DAY"]),
  notes: z.string().optional().nullable(),
});

export const markBulkDailyAttendanceSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  attendances: z.array(attendanceItemSchema).min(1, "At least one employee attendance record is required"),
});

export const createAllowanceSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  userId: z.string().uuid("Invalid employee user ID"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  title: z.string().min(1, "Allowance title is required"),
  amount: z.number().positive("Allowance amount must be greater than 0"),
  notes: z.string().optional().nullable(),
});

export const deactivateEmployeeSchema = z.object({
  resignationDate: z.string().optional().nullable(),
  resignationReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type SetBranchOffDayConfigInput = z.infer<typeof setBranchOffDayConfigSchema>;
export type MarkBulkDailyAttendanceInput = z.infer<typeof markBulkDailyAttendanceSchema>;
export type CreateAllowanceInput = z.infer<typeof createAllowanceSchema>;
export type DeactivateEmployeeInput = z.infer<typeof deactivateEmployeeSchema>;
