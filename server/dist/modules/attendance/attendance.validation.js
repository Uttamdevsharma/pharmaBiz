"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateEmployeeSchema = exports.createAllowanceSchema = exports.markBulkDailyAttendanceSchema = exports.attendanceItemSchema = exports.setBranchOffDayConfigSchema = void 0;
const zod_1 = require("zod");
exports.setBranchOffDayConfigSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    month: zod_1.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
    weeklyOffDays: zod_1.z.array(zod_1.z.string()).min(1, "At least one weekly off-day must be selected"),
    customOffDates: zod_1.z.array(zod_1.z.string()).optional().default([]),
    notes: zod_1.z.string().optional().nullable(),
});
exports.attendanceItemSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid("Invalid user ID"),
    status: zod_1.z.enum(["PRESENT", "ABSENT", "LATE", "PAID_LEAVE", "UNPAID_LEAVE", "OFF_DAY"]),
    notes: zod_1.z.string().optional().nullable(),
});
exports.markBulkDailyAttendanceSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    attendances: zod_1.z.array(exports.attendanceItemSchema).min(1, "At least one employee attendance record is required"),
});
exports.createAllowanceSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    userId: zod_1.z.string().uuid("Invalid employee user ID"),
    month: zod_1.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
    title: zod_1.z.string().min(1, "Allowance title is required"),
    amount: zod_1.z.number().positive("Allowance amount must be greater than 0"),
    notes: zod_1.z.string().optional().nullable(),
});
exports.deactivateEmployeeSchema = zod_1.z.object({
    resignationDate: zod_1.z.string().optional().nullable(),
    resignationReason: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
