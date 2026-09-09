"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
const DAY_INDEX_MAP = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
};
class AttendanceService {
    /**
     * Helper: computes month calendar days, off-days, and working days
     */
    static getMonthDaysAndOffDays(month, weeklyOffDays = ["FRIDAY"], customOffDates = []) {
        const [yearStr, monthStr] = month.split("-");
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10); // 1-indexed
        // Number of days in month: date with day 0 of next month
        const totalDays = new Date(year, monthNum, 0).getDate();
        const normalizedWeeklyOffs = weeklyOffDays.map((d) => d.trim().toUpperCase());
        const customOffSet = new Set(customOffDates.map((d) => d.trim()));
        const calendarDays = [];
        let offDaysCount = 0;
        for (let day = 1; day <= totalDays; day++) {
            const dayDate = new Date(year, monthNum - 1, day);
            const dateStr = `${yearStr}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayOfWeekName = DAY_INDEX_MAP[dayDate.getDay()];
            const isWeeklyOff = normalizedWeeklyOffs.includes(dayOfWeekName);
            const isCustomOff = customOffSet.has(dateStr);
            const isOffDay = isWeeklyOff || isCustomOff;
            if (isOffDay) {
                offDaysCount++;
            }
            calendarDays.push({
                date: dateStr,
                dayNumber: day,
                dayOfWeek: dayOfWeekName,
                isOffDay,
                isWeeklyOff,
                isCustomOff,
            });
        }
        const workingDaysCount = Math.max(0, totalDays - offDaysCount);
        return {
            month,
            year,
            monthNum,
            totalDays,
            offDaysCount,
            workingDaysCount,
            calendarDays,
        };
    }
    /**
     * 1. Get branch off-day configuration for a month
     */
    static async getBranchOffDayConfig(tenantId, branchId, month) {
        const config = await prisma_1.prisma.branchOffDayConfig.findUnique({
            where: {
                branchId_month: { branchId, month },
            },
        });
        const weeklyOffDays = config?.weeklyOffDays || ["FRIDAY"];
        const customOffDates = config?.customOffDates || [];
        const meta = this.getMonthDaysAndOffDays(month, weeklyOffDays, customOffDates);
        return {
            config,
            weeklyOffDays,
            customOffDates,
            notes: config?.notes || null,
            meta,
        };
    }
    /**
     * 2. Save branch off-day configuration for a month (Manager / Owner)
     */
    static async setBranchOffDayConfig(tenantId, branchId, month, data, actorId) {
        const weeklyOffDays = data.weeklyOffDays.map((d) => d.trim().toUpperCase());
        const customOffDates = (data.customOffDates || []).map((d) => d.trim());
        const saved = await prisma_1.prisma.branchOffDayConfig.upsert({
            where: {
                branchId_month: { branchId, month },
            },
            update: {
                weeklyOffDays,
                customOffDates,
                notes: data.notes?.trim() || null,
            },
            create: {
                tenantId,
                branchId,
                month,
                weeklyOffDays,
                customOffDates,
                notes: data.notes?.trim() || null,
                createdById: actorId,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId,
            userId: actorId,
            action: "BRANCH_OFF_DAYS_CONFIGURED",
            details: { month, weeklyOffDays, customOffDates },
        });
        const meta = this.getMonthDaysAndOffDays(month, weeklyOffDays, customOffDates);
        return { saved, meta };
    }
    /**
     * 3. Get daily attendance sheet for a branch on a specific date
     */
    static async getDailyAttendanceSheet(tenantId, branchId, date) {
        const month = date.slice(0, 7);
        const offDayData = await this.getBranchOffDayConfig(tenantId, branchId, month);
        const dayMeta = offDayData.meta.calendarDays.find((d) => d.date === date);
        const isOffDay = dayMeta?.isOffDay || false;
        // Fetch active employees for this branch
        const employees = await prisma_1.prisma.user.findMany({
            where: {
                tenantId,
                branchId,
                role: {
                    notIn: ["COMPANY_OWNER", "SUPER_ADMIN"],
                },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                customRoleName: true,
                pharmacyRoleName: true,
                avatarUrl: true,
                phone: true,
                salaryConfig: {
                    select: {
                        baseSalary: true,
                        netSalary: true,
                    },
                },
            },
            orderBy: [{ name: "asc" }, { username: "asc" }],
        });
        // Fetch existing attendance records for this date
        const existing = await prisma_1.prisma.employeeAttendance.findMany({
            where: {
                tenantId,
                branchId,
                date,
            },
            include: {
                markedBy: {
                    select: { id: true, name: true, username: true },
                },
            },
        });
        const recordMap = new Map(existing.map((r) => [r.userId, r]));
        const roster = employees.map((emp) => {
            const record = recordMap.get(emp.id);
            return {
                id: emp.id,
                name: emp.name,
                username: emp.username,
                role: emp.customRoleName || emp.pharmacyRoleName || emp.role.replace(/_/g, " "),
                avatarUrl: emp.avatarUrl,
                phone: emp.phone,
                status: record ? record.status : isOffDay ? "OFF_DAY" : "PRESENT",
                hasSavedRecord: Boolean(record),
                notes: record?.notes || "",
                markedBy: record?.markedBy || null,
                updatedAt: record?.updatedAt || null,
            };
        });
        return {
            date,
            month,
            isOffDay,
            dayOfWeek: dayMeta?.dayOfWeek || "",
            roster,
        };
    }
    /**
     * 4. Manager saves/finalizes daily attendance in bulk
     */
    static async markBulkDailyAttendance(tenantId, branchId, date, data, actorId) {
        const results = await prisma_1.prisma.$transaction(data.attendances.map((item) => prisma_1.prisma.employeeAttendance.upsert({
            where: {
                userId_date: {
                    userId: item.userId,
                    date,
                },
            },
            update: {
                status: item.status,
                notes: item.notes?.trim() || null,
                markedById: actorId,
            },
            create: {
                tenantId,
                branchId,
                userId: item.userId,
                date,
                status: item.status,
                notes: item.notes?.trim() || null,
                markedById: actorId,
            },
        })));
        await audit_1.AuditService.log({
            tenantId,
            branchId,
            userId: actorId,
            action: "ATTENDANCE_BULK_MARKED",
            details: { date, count: results.length },
        });
        return results;
    }
    /**
     * 5. Get complete attendance history for a single employee in a month
     */
    static async getEmployeeAttendanceHistory(tenantId, userId, month, requestingUser) {
        const employee = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId },
            include: {
                branch: { select: { id: true, name: true } },
                salaryConfig: true,
            },
        });
        if (!employee)
            throw new Error("Employee not found.");
        if (requestingUser) {
            const isOwnerOrAdmin = requestingUser.role === "COMPANY_OWNER" ||
                requestingUser.role === "SUPER_ADMIN" ||
                requestingUser.role === "REGIONAL_ADMIN";
            const isBranchManager = requestingUser.role === "BRANCH_MANAGER" ||
                requestingUser.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                requestingUser.customRoleName?.toLowerCase().includes("branch manager");
            if (isBranchManager && !isOwnerOrAdmin) {
                const reqBranchId = requestingUser.branchId;
                if (reqBranchId && employee.branchId && employee.branchId !== reqBranchId) {
                    throw new Error("Access denied: You can only view attendance history of employees in your branch.");
                }
            }
        }
        const branchId = employee.branchId;
        if (!branchId)
            throw new Error("Employee is not assigned to a branch.");
        const offDayData = await this.getBranchOffDayConfig(tenantId, branchId, month);
        const { calendarDays, totalDays, offDaysCount, workingDaysCount } = offDayData.meta;
        // Fetch all attendance records for this month
        const attendances = await prisma_1.prisma.employeeAttendance.findMany({
            where: {
                tenantId,
                userId,
                date: {
                    startsWith: month,
                },
            },
            include: {
                markedBy: { select: { id: true, name: true, username: true } },
            },
        });
        const recordMap = new Map(attendances.map((a) => [a.date, a]));
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        let offDays = 0;
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const history = calendarDays.map((day) => {
            const record = recordMap.get(day.date);
            let status;
            if (record) {
                status = record.status;
            }
            else if (day.isOffDay) {
                status = "OFF_DAY";
            }
            else {
                // Working day without explicit record
                if (day.date < todayStr) {
                    status = "ABSENT";
                }
                else {
                    status = "NOT_MARKED";
                }
            }
            if (status === "PRESENT")
                presentDays++;
            else if (status === "ABSENT")
                absentDays++;
            else if (status === "LATE")
                lateDays++;
            else if (status === "PAID_LEAVE")
                paidLeaveDays++;
            else if (status === "UNPAID_LEAVE")
                unpaidLeaveDays++;
            else if (status === "OFF_DAY")
                offDays++;
            return {
                date: day.date,
                dayNumber: day.dayNumber,
                dayOfWeek: day.dayOfWeek,
                isOffDay: day.isOffDay,
                status,
                notes: record?.notes || null,
                markedBy: record?.markedBy || null,
            };
        });
        return {
            employee: {
                id: employee.id,
                name: employee.name,
                username: employee.username,
                role: employee.customRoleName || employee.pharmacyRoleName || employee.role.replace(/_/g, " "),
                branch: employee.branch,
                isActive: employee.isActive,
                resignationDate: employee.resignationDate,
                resignationReason: employee.resignationReason,
                deactivatedAt: employee.deactivatedAt,
            },
            month,
            summary: {
                totalDays,
                offDays,
                totalWorkingDays: workingDaysCount,
                presentDays,
                absentDays,
                lateDays,
                paidLeaveDays,
                unpaidLeaveDays,
            },
            history,
        };
    }
    /**
     * 6. Calculate monthly salary with automatic attendance deduction and dynamic allowances
     */
    static async calculateMonthlySalary(tenantId, branchId, userId, month) {
        const employee = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId },
            include: {
                salaryConfig: true,
                branch: { select: { id: true, name: true } },
            },
        });
        if (!employee)
            throw new Error("Employee not found.");
        const config = employee.salaryConfig;
        const baseSalary = Number(config?.baseSalary || 0);
        const packageAllowances = Number(config?.allowances || 0);
        const packageDeductions = Number(config?.deductions || 0);
        // Fetch attendance metrics
        const attendanceData = await this.getEmployeeAttendanceHistory(tenantId, userId, month);
        const { totalDays, offDays, totalWorkingDays, presentDays, absentDays, lateDays, paidLeaveDays, unpaidLeaveDays } = attendanceData.summary;
        // Daily rate = baseSalary / totalWorkingDays
        const dailyRate = totalWorkingDays > 0 ? Number((baseSalary / totalWorkingDays).toFixed(2)) : 0;
        // Fetch SalaryDeductionRule
        const deductionRule = await prisma_1.prisma.salaryDeductionRule.findUnique({
            where: { branchId },
        });
        let penalDays = unpaidLeaveDays;
        const absentRatio = deductionRule?.absentRuleRatio ? Number(deductionRule.absentRuleRatio) : 1; // Default 1:1 if not set
        if (absentRatio > 0) {
            penalDays += absentDays / absentRatio;
        }
        const lateRatio = deductionRule?.lateRuleRatio ? Number(deductionRule.lateRuleRatio) : 0; // Default disabled if not set
        if (lateRatio > 0) {
            penalDays += lateDays / lateRatio;
        }
        const attendanceDeduction = Number((penalDays * dailyRate).toFixed(2));
        // Dynamic monthly allowances
        const monthlyAllowances = await prisma_1.prisma.employeeMonthlyAllowance.findMany({
            where: {
                tenantId,
                branchId,
                userId,
                month,
            },
            orderBy: { createdAt: "asc" },
        });
        const dynamicAllowancesTotal = monthlyAllowances.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const totalAllowances = Number((packageAllowances + dynamicAllowancesTotal).toFixed(2));
        const totalDeductions = Number((packageDeductions + attendanceDeduction).toFixed(2));
        // Final payable salary
        const finalPayable = Math.max(0, Number((baseSalary - attendanceDeduction + totalAllowances - packageDeductions).toFixed(2)));
        // Check disbursement status for this month
        const disbursements = await prisma_1.prisma.salaryDisbursement.findMany({
            where: { tenantId, userId, month },
            include: {
                financialAccount: { select: { id: true, name: true, type: true } },
                disbursedBy: { select: { id: true, name: true, username: true } },
            },
            orderBy: { paymentDate: "desc" },
        });
        const paidAmount = disbursements.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
        const dueAmount = Math.max(0, Number((finalPayable - paidAmount).toFixed(2)));
        const status = finalPayable > 0 && paidAmount >= finalPayable ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE";
        return {
            employee: {
                id: employee.id,
                name: employee.name,
                username: employee.username,
                role: employee.customRoleName || employee.pharmacyRoleName || employee.role.replace(/_/g, " "),
                branch: employee.branch,
                isActive: employee.isActive,
                resignationDate: employee.resignationDate,
            },
            month,
            metrics: {
                baseSalary,
                totalDays,
                offDays,
                totalWorkingDays,
                presentDays,
                absentDays,
                paidLeaveDays,
                unpaidLeaveDays,
                dailyRate,
                attendanceDeduction, // Locked/read-only
                packageAllowances,
                dynamicAllowancesTotal,
                totalAllowances,
                otherDeductions: packageDeductions,
                totalDeductions,
                finalPayable,
                paidAmount,
                dueAmount,
                status,
            },
            monthlyAllowances,
            disbursements,
        };
    }
    /**
     * 7. Branch Monthly Attendance and Payroll Summary for all branch staff
     */
    static async getBranchMonthlyAttendanceSummary(tenantId, branchId, month) {
        const employees = await prisma_1.prisma.user.findMany({
            where: {
                tenantId,
                branchId,
                role: {
                    notIn: ["COMPANY_OWNER", "SUPER_ADMIN"],
                },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                customRoleName: true,
                pharmacyRoleName: true,
                avatarUrl: true,
                salaryConfig: true,
            },
            orderBy: [{ name: "asc" }, { username: "asc" }],
        });
        const calculations = await Promise.all(employees.map((emp) => this.calculateMonthlySalary(tenantId, branchId, emp.id, month)));
        return calculations;
    }
    /**
     * 8. Dynamic Monthly Allowances
     */
    static async listEmployeeAllowances(tenantId, branchId, userId, month) {
        return prisma_1.prisma.employeeMonthlyAllowance.findMany({
            where: { tenantId, branchId, userId, month },
            orderBy: { createdAt: "desc" },
        });
    }
    static async addEmployeeAllowance(tenantId, branchId, userId, month, data, actorId) {
        const allowance = await prisma_1.prisma.employeeMonthlyAllowance.create({
            data: {
                tenantId,
                branchId,
                userId,
                month,
                title: data.title.trim(),
                amount: data.amount,
                notes: data.notes?.trim() || null,
                createdById: actorId,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId,
            userId: actorId,
            action: "EMPLOYEE_ALLOWANCE_ADDED",
            details: { allowanceId: allowance.id, employeeId: userId, month, title: data.title, amount: data.amount },
        });
        return allowance;
    }
    static async deleteEmployeeAllowance(tenantId, allowanceId, actorId) {
        const existing = await prisma_1.prisma.employeeMonthlyAllowance.findFirst({
            where: { id: allowanceId, tenantId },
        });
        if (!existing)
            throw new Error("Allowance not found.");
        await prisma_1.prisma.employeeMonthlyAllowance.delete({
            where: { id: allowanceId },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: existing.branchId,
            userId: actorId,
            action: "EMPLOYEE_ALLOWANCE_DELETED",
            details: { allowanceId, title: existing.title, amount: existing.amount },
        });
        return { success: true };
    }
    /**
     * 9. Employee Resignation / Deactivation
     */
    static async deactivateEmployee(tenantId, branchId, userId, data, actorId) {
        const employee = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId, branchId },
        });
        if (!employee)
            throw new Error("Employee not found in this branch.");
        const updated = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                resignationDate: data.resignationDate ? new Date(data.resignationDate) : new Date(),
                resignationReason: data.resignationReason?.trim() || null,
                deactivatedAt: new Date(),
                deactivatedById: actorId,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId,
            userId: actorId,
            action: "EMPLOYEE_DEACTIVATED",
            details: {
                employeeId: userId,
                name: employee.name || employee.username,
                resignationDate: data.resignationDate,
                reason: data.resignationReason,
            },
        });
        return updated;
    }
    static async reactivateEmployee(tenantId, branchId, userId, actorId) {
        const employee = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId, branchId },
        });
        if (!employee)
            throw new Error("Employee not found in this branch.");
        const updated = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: true,
                resignationDate: null,
                resignationReason: null,
                deactivatedAt: null,
                deactivatedById: null,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId,
            userId: actorId,
            action: "EMPLOYEE_REACTIVATED",
            details: { employeeId: userId, name: employee.name || employee.username },
        });
        return updated;
    }
}
exports.AttendanceService = AttendanceService;
