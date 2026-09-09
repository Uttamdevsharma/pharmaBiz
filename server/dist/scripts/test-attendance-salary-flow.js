"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../app/lib/prisma");
const attendance_service_1 = require("../modules/attendance/attendance.service");
const accounting_service_1 = require("../modules/accounting/accounting.service");
async function runTest() {
    console.log("=== STARTING ATTENDANCE & SALARY FLOW TEST ===");
    // 1. Find or create a tenant, branch, staff member, and manager/owner
    let tenant = await prisma_1.prisma.tenant.findFirst({
        include: {
            branches: true,
            users: true,
        },
    });
    if (!tenant) {
        console.log("No tenant found. Creating a test tenant...");
        tenant = await prisma_1.prisma.tenant.create({
            data: {
                name: "PharmaCare Test Ltd",
                subdomain: `testpharma_${Date.now()}`,
                status: "ACTIVE",
            },
            include: {
                branches: true,
                users: true,
            },
        });
    }
    let branch = tenant.branches[0];
    if (!branch) {
        console.log("No branch found. Creating a test branch...");
        branch = await prisma_1.prisma.branch.create({
            data: {
                tenantId: tenant.id,
                name: "Main Branch",
                location: "123 Healthcare Ave, Dhaka",
                isActive: true,
            },
        });
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`Using Branch: ${branch.name} (${branch.id})`);
    // Find or create an employee with role STAFF
    let staff = tenant.users.find((u) => u.role !== "COMPANY_OWNER" && u.role !== "SUPER_ADMIN" && u.branchId === branch.id);
    if (!staff) {
        staff = tenant.users.find((u) => u.role !== "COMPANY_OWNER" && u.role !== "SUPER_ADMIN");
    }
    if (!staff) {
        console.log("Creating a temporary staff user for testing...");
        staff = await prisma_1.prisma.user.create({
            data: {
                tenantId: tenant.id,
                branchId: branch.id,
                username: `teststaff_${Date.now()}`,
                email: `teststaff_${Date.now()}@pharmabiz.local`,
                name: "Test Pharmacist",
                passwordHash: "dummyhash",
                role: "STAFF",
                isActive: true,
            },
        });
    }
    else if (!staff.branchId) {
        staff = await prisma_1.prisma.user.update({
            where: { id: staff.id },
            data: { branchId: branch.id },
        });
    }
    console.log(`Using Staff User: ${staff.name || staff.username} (${staff.id})`);
    // Find or create a manager/actor
    const manager = tenant.users.find((u) => u.role === "COMPANY_OWNER" || u.role === "BRANCH_MANAGER") || staff;
    // Find or create a real branch financial account
    let account = await prisma_1.prisma.financialAccount.findFirst({
        where: {
            tenantId: tenant.id,
            branchId: branch.id,
            isActive: true,
        },
    });
    if (!account) {
        account = await prisma_1.prisma.financialAccount.create({
            data: {
                tenantId: tenant.id,
                branchId: branch.id,
                name: "Main Cash Drawer",
                type: "CASH",
                balance: 50000,
                isActive: true,
            },
        });
    }
    else if (Number(account.balance) < 20000) {
        account = await prisma_1.prisma.financialAccount.update({
            where: { id: account.id },
            data: { balance: 50000 },
        });
    }
    const initialBalance = Number(account.balance);
    console.log(`Using Financial Account: ${account.name} (Initial Balance: ৳${initialBalance})`);
    // 2. Configure Base Salary: ৳30,000
    const BASE_SALARY = 30000;
    await accounting_service_1.AccountingService.setSalaryConfig(tenant.id, {
        branchId: branch.id,
        userId: staff.id,
        baseSalary: BASE_SALARY,
        allowances: 0,
        deductions: 0,
        paymentMethod: "CASH",
        paymentDetails: "Cash in hand",
    });
    console.log(`✓ Set Base Salary to ৳${BASE_SALARY}`);
    // Test Month
    const testMonth = "2026-09";
    // Clean up prior test data for this employee & month
    await prisma_1.prisma.employeeMonthlyAllowance.deleteMany({
        where: { userId: staff.id, month: testMonth },
    });
    await prisma_1.prisma.salaryDisbursement.deleteMany({
        where: { userId: staff.id, month: testMonth },
    });
    await prisma_1.prisma.employeeAttendance.deleteMany({
        where: { userId: staff.id, date: { startsWith: testMonth } },
    });
    // 3. Configure Monthly Off-Days: Friday (5) & Saturday (6)
    await attendance_service_1.AttendanceService.setBranchOffDayConfig(tenant.id, branch.id, testMonth, {
        branchId: branch.id,
        month: testMonth,
        weeklyOffDays: ["FRIDAY", "SATURDAY"],
        customOffDates: [],
        notes: "Standard weekend off-days",
    }, manager.id);
    console.log(`✓ Configured Weekly Off-Days (Friday & Saturday) for ${testMonth}`);
    // 4. Mark Attendance for working days:
    // Sept 1, 2026 is Tuesday -> Mark PRESENT
    // Sept 2, 2026 is Wednesday -> Mark PRESENT
    // Sept 3, 2026 is Thursday -> Mark ABSENT
    // Sept 4, 2026 is Friday -> Off-Day (no deduction)
    await attendance_service_1.AttendanceService.markBulkDailyAttendance(tenant.id, branch.id, "2026-09-01", {
        branchId: branch.id,
        date: "2026-09-01",
        attendances: [{ userId: staff.id, status: "PRESENT" }],
    }, manager.id);
    await attendance_service_1.AttendanceService.markBulkDailyAttendance(tenant.id, branch.id, "2026-09-02", {
        branchId: branch.id,
        date: "2026-09-02",
        attendances: [{ userId: staff.id, status: "PRESENT" }],
    }, manager.id);
    await attendance_service_1.AttendanceService.markBulkDailyAttendance(tenant.id, branch.id, "2026-09-03", {
        branchId: branch.id,
        date: "2026-09-03",
        attendances: [{ userId: staff.id, status: "ABSENT" }],
    }, manager.id);
    console.log(`✓ Recorded attendance: 2 Present, 1 Absent`);
    // 5. Add Dynamic Monthly Allowance: ৳1,500 Festival / Performance Bonus
    const allowance = await attendance_service_1.AttendanceService.addEmployeeAllowance(tenant.id, branch.id, staff.id, testMonth, {
        branchId: branch.id,
        userId: staff.id,
        month: testMonth,
        title: "Performance Bonus",
        amount: 1500,
        notes: "Outstanding sales target met",
    }, manager.id);
    console.log(`✓ Added dynamic allowance: ${allowance.title} (+৳${allowance.amount})`);
    // 6. Calculate Salary from Attendance
    const calc = await attendance_service_1.AttendanceService.calculateMonthlySalary(tenant.id, branch.id, staff.id, testMonth);
    const m = calc.metrics;
    console.log("\n--- AUTOMATED CALCULATION VERIFICATION ---");
    console.log(`Total Days in ${testMonth}: ${m.totalDays}`);
    console.log(`Off-Days Excluded: ${m.offDays}`);
    console.log(`Working Days: ${m.totalWorkingDays}`);
    console.log(`Base Salary: ৳${m.baseSalary}`);
    console.log(`Daily Rate (Base / Working Days): ৳${m.dailyRate}`);
    console.log(`Present Days: ${m.presentDays}`);
    console.log(`Absent Days: ${m.absentDays}`);
    console.log(`Attendance Deduction: -৳${m.attendanceDeduction}`);
    console.log(`Dynamic Allowances: +৳${m.totalAllowances}`);
    console.log(`Net Payable: ৳${m.finalPayable}`);
    // Assertions
    if (m.absentDays !== 1) {
        throw new Error(`Expected absentDays to be 1, got ${m.absentDays}`);
    }
    const expectedDailyRate = Number((BASE_SALARY / m.totalWorkingDays).toFixed(2));
    if (Math.abs(m.dailyRate - expectedDailyRate) > 0.05) {
        throw new Error(`Daily rate mismatch: expected ${expectedDailyRate}, got ${m.dailyRate}`);
    }
    if (Math.abs(m.attendanceDeduction - m.dailyRate) > 0.05) {
        throw new Error(`Attendance deduction mismatch: expected ${m.dailyRate}, got ${m.attendanceDeduction}`);
    }
    const expectedPayable = Number((BASE_SALARY - m.attendanceDeduction + 1500).toFixed(2));
    if (Math.abs(m.finalPayable - expectedPayable) > 0.05) {
        throw new Error(`Payable salary mismatch: expected ${expectedPayable}, got ${m.finalPayable}`);
    }
    console.log("✓ All calculation formula assertions PASSED!");
    // 7. Pay Salary (Disburse exact Net Payable)
    const disburseAmount = m.finalPayable;
    console.log(`\n--- DISBURSING SALARY PAYMENT OF ৳${disburseAmount} ---`);
    const disburseResult = await accounting_service_1.AccountingService.disburseSalary(tenant.id, manager.id, {
        branchId: branch.id,
        userId: staff.id,
        financialAccountId: account.id,
        month: testMonth,
        paidAmount: disburseAmount,
        paymentRef: `TEST-PAY-${Date.now().toString().slice(-4)}`,
        notes: "Full salary disbursed after attendance deduction and bonus",
    });
    console.log(`✓ Salary disbursed successfully! Disbursement ID: ${disburseResult.id}`);
    // 8. Verify Financial Account Balance Deduction
    const updatedAccount = await prisma_1.prisma.financialAccount.findUnique({
        where: { id: account.id },
    });
    const expectedBalance = initialBalance - disburseAmount;
    console.log(`Financial Account Initial: ৳${initialBalance}`);
    console.log(`Financial Account New Balance: ৳${Number(updatedAccount.balance)}`);
    console.log(`Expected Balance: ৳${expectedBalance}`);
    if (Math.abs(Number(updatedAccount.balance) - expectedBalance) > 0.01) {
        throw new Error("Financial account balance was NOT correctly deducted!");
    }
    console.log("✓ Financial account balance deduction verified!");
    // 9. Verify Permanent Salary History Snapshot
    const savedDisbursement = await prisma_1.prisma.salaryDisbursement.findUnique({
        where: { id: disburseResult.id },
    });
    console.log("\n--- IMMUTABLE VOUCHER SNAPSHOT CHECK ---");
    console.log(`Voucher ID: ${savedDisbursement?.id}`);
    console.log(`Voucher Month: ${savedDisbursement?.month}`);
    console.log(`Voucher Amount: ৳${savedDisbursement?.paidAmount}`);
    console.log(`Snapshot Working Days: ${savedDisbursement?.workingDays}`);
    console.log(`Snapshot Daily Rate: ৳${savedDisbursement?.dailyRate}`);
    console.log(`Snapshot Attendance Deduction: ৳${savedDisbursement?.attendanceDeduction}`);
    console.log(`Snapshot Present / Absent: ${savedDisbursement?.presentDays} / ${savedDisbursement?.absentDays}`);
    if (Number(savedDisbursement?.attendanceDeduction) !== m.attendanceDeduction) {
        throw new Error("Disbursement snapshot attendanceDeduction does not match calculated deduction!");
    }
    console.log("✓ Immutable attendance deduction snapshot verified in permanent voucher!");
    // 10. Verify Branch and Employee History Queries
    const branchHistory = await accounting_service_1.AccountingService.getBranchSalaryHistory(tenant.id, branch.id, {
        month: testMonth,
        userId: staff.id,
    });
    if (branchHistory.items.length === 0) {
        throw new Error("Disbursement not found in branch salary history!");
    }
    console.log(`✓ Found ${branchHistory.items.length} disbursement record(s) in branch salary history`);
    const employeeHistory = await accounting_service_1.AccountingService.getEmployeeSalaryHistory(tenant.id, staff.id);
    if (employeeHistory.disbursements.length === 0) {
        throw new Error("Disbursement not found in employee salary history!");
    }
    console.log(`✓ Found ${employeeHistory.disbursements.length} disbursement record(s) in employee profile history`);
    console.log("\n=== ALL FLOW TESTS COMPLETED SUCCESSFULLY ===");
}
runTest()
    .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
