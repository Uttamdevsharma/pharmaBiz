"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
class AccountingService {
    /**
     * List all financial accounts for a tenant / branch with live metadata.
     * Only returns accounts actually created by the pharmacy — no auto-seeding.
     */
    static async listAccounts(tenantId, branchId) {
        const where = { tenantId, isActive: true };
        if (branchId) {
            where.branchId = branchId;
        }
        const accounts = await prisma_1.prisma.financialAccount.findMany({
            where,
            orderBy: [{ isDefault: "desc" }, { type: "asc" }, { createdAt: "asc" }],
            include: {
                branch: { select: { id: true, name: true } },
            },
        });
        return accounts;
    }
    /**
     * Create a new custom financial account (Cash, bKash, Nagad, or named Bank Account)
     */
    static async createAccount(tenantId, userId, data) {
        const account = await prisma_1.prisma.financialAccount.create({
            data: {
                tenantId,
                branchId: data.branchId,
                name: data.name.trim(),
                type: data.type,
                accountNumber: data.accountNumber?.trim() || null,
                bankName: data.bankName?.trim() || null,
                branchName: data.branchName?.trim() || null,
                routingNumber: data.routingNumber?.trim() || null,
                isDefault: Boolean(data.isDefault),
                description: data.description?.trim() || null,
                balance: data.initialBalance || 0,
                isActive: true,
            },
            include: {
                branch: { select: { id: true, name: true } },
            },
        });
        if (data.initialBalance && data.initialBalance > 0) {
            await prisma_1.prisma.financialTransaction.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    destinationAccountId: account.id,
                    amount: data.initialBalance,
                    type: "INCOME",
                    reference: "INITIAL_BALANCE",
                    note: `Initial opening balance for ${account.name}`,
                    userId,
                },
            });
        }
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: "ACCOUNT_CREATED",
            details: { accountId: account.id, name: account.name, type: account.type, balance: account.balance },
        });
        return account;
    }
    /**
     * Update an existing financial account
     */
    static async updateAccount(tenantId, accountId, userId, data) {
        const existing = await prisma_1.prisma.financialAccount.findFirst({
            where: { id: accountId, tenantId },
        });
        if (!existing)
            throw new Error("Financial account not found");
        const updated = await prisma_1.prisma.financialAccount.update({
            where: { id: accountId },
            data: {
                ...(data.name !== undefined && { name: data.name.trim() }),
                ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber?.trim() || null }),
                ...(data.bankName !== undefined && { bankName: data.bankName?.trim() || null }),
                ...(data.branchName !== undefined && { branchName: data.branchName?.trim() || null }),
                ...(data.routingNumber !== undefined && { routingNumber: data.routingNumber?.trim() || null }),
                ...(data.isDefault !== undefined && { isDefault: Boolean(data.isDefault) }),
                ...(data.description !== undefined && { description: data.description?.trim() || null }),
                ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
            },
            include: {
                branch: { select: { id: true, name: true } },
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: existing.branchId,
            userId,
            action: "ACCOUNT_UPDATED",
            details: { accountId, changes: data },
        });
        return updated;
    }
    /**
     * Safely remove/deactivate a financial account so transactions, transfers, and sales history remain intact
     */
    static async deleteAccount(tenantId, accountId, userId) {
        const existing = await prisma_1.prisma.financialAccount.findFirst({
            where: { id: accountId, tenantId },
        });
        if (!existing)
            throw new Error("Financial account not found");
        if (Number(existing.balance) > 0) {
            throw new Error(`Cannot remove account "${existing.name}" because it still has an active balance of ৳${Number(existing.balance).toFixed(2)}. Please transfer or withdraw the balance to ৳0 first.`);
        }
        const deactivated = await prisma_1.prisma.financialAccount.update({
            where: { id: accountId },
            data: { isActive: false },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: existing.branchId,
            userId,
            action: "ACCOUNT_DEACTIVATED",
            details: { accountId, name: existing.name, type: existing.type },
        });
        return deactivated;
    }
    /**
     * Transfer funds between two accounts (Double-entry transfer ledger)
     */
    static async transferFunds(tenantId, userId, data) {
        if (data.sourceAccountId === data.destinationAccountId) {
            throw new Error("Source and destination accounts must be different");
        }
        const [sourceAcc, destAcc] = await Promise.all([
            prisma_1.prisma.financialAccount.findFirst({
                where: { id: data.sourceAccountId, tenantId },
            }),
            prisma_1.prisma.financialAccount.findFirst({
                where: { id: data.destinationAccountId, tenantId },
            }),
        ]);
        if (!sourceAcc)
            throw new Error("Source financial account not found");
        if (!destAcc)
            throw new Error("Destination financial account not found");
        if (Number(sourceAcc.balance) < data.amount) {
            throw new Error(`Insufficient funds in ${sourceAcc.name}. Current balance: ৳${Number(sourceAcc.balance).toFixed(2)}`);
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Decrement source account balance
            const updatedSource = await tx.financialAccount.update({
                where: { id: sourceAcc.id },
                data: { balance: { decrement: data.amount } },
            });
            // 2. Increment destination account balance
            const updatedDest = await tx.financialAccount.update({
                where: { id: destAcc.id },
                data: { balance: { increment: data.amount } },
            });
            // 3. Record atomic ledger transaction
            const transaction = await tx.financialTransaction.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    sourceAccountId: sourceAcc.id,
                    destinationAccountId: destAcc.id,
                    amount: data.amount,
                    type: "TRANSFER",
                    reference: data.reference || `TRF-${Date.now().toString().slice(-6)}`,
                    note: data.note || `Transferred from ${sourceAcc.name} to ${destAcc.name}`,
                    userId,
                },
                include: {
                    sourceAccount: { select: { id: true, name: true, type: true } },
                    destinationAccount: { select: { id: true, name: true, type: true } },
                    user: { select: { id: true, name: true, username: true } },
                },
            });
            return {
                transaction,
                sourceAccount: updatedSource,
                destinationAccount: updatedDest,
            };
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: "FINANCIAL_TRANSFER",
            details: {
                from: sourceAcc.name,
                to: destAcc.name,
                amount: data.amount,
                sourcePreviousBalance: Number(sourceAcc.balance),
                sourceNewBalance: Number(result.sourceAccount.balance),
                destPreviousBalance: Number(destAcc.balance),
                destNewBalance: Number(result.destinationAccount.balance),
                note: data.note,
            },
        });
        return result;
    }
    /**
     * Record manual Income or Expense
     */
    static async recordIncomeExpense(tenantId, userId, data) {
        const account = await prisma_1.prisma.financialAccount.findFirst({
            where: { id: data.accountId, tenantId },
        });
        if (!account)
            throw new Error("Financial account not found");
        if (data.type === "EXPENSE" && Number(account.balance) < data.amount) {
            throw new Error(`Insufficient funds in ${account.name}. Current balance: ৳${Number(account.balance).toFixed(2)}`);
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const isDeduction = data.type === "EXPENSE" || data.type === "PURCHASE_PAYMENT" || data.type === "REFUND";
            const updatedAccount = await tx.financialAccount.update({
                where: { id: account.id },
                data: isDeduction
                    ? { balance: { decrement: data.amount } }
                    : { balance: { increment: data.amount } },
            });
            const transaction = await tx.financialTransaction.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    sourceAccountId: isDeduction ? account.id : null,
                    destinationAccountId: !isDeduction ? account.id : null,
                    amount: data.amount,
                    type: data.type,
                    reference: data.reference || `${data.type.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
                    note: data.note || `${data.type} recorded for ${account.name}`,
                    userId,
                },
                include: {
                    sourceAccount: { select: { id: true, name: true, type: true } },
                    destinationAccount: { select: { id: true, name: true, type: true } },
                    user: { select: { id: true, name: true, username: true } },
                },
            });
            return { transaction, updatedAccount };
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: `FINANCIAL_${data.type}`,
            details: {
                accountId: account.id,
                accountName: account.name,
                amount: data.amount,
                type: data.type,
                newBalance: Number(result.updatedAccount.balance),
                note: data.note,
            },
        });
        return result;
    }
    /**
     * List all financial transactions ledger with filtering and pagination
     */
    static async listTransactions(tenantId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.accountId) {
            where.OR = [
                { sourceAccountId: query.accountId },
                { destinationAccountId: query.accountId },
            ];
        }
        if (query.type) {
            where.type = query.type;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate)
                where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        const [total, transactions] = await Promise.all([
            prisma_1.prisma.financialTransaction.count({ where }),
            prisma_1.prisma.financialTransaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    sourceAccount: { select: { id: true, name: true, type: true } },
                    destinationAccount: { select: { id: true, name: true, type: true } },
                    user: { select: { id: true, name: true, username: true } },
                    branch: { select: { id: true, name: true } },
                },
            }),
        ]);
        return {
            data: transactions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    static async getFinancialOverview(tenantId, branchId, options) {
        const where = { tenantId, isActive: true };
        if (branchId) {
            where.OR = [{ branchId }, { branchId: null }];
        }
        const accounts = await prisma_1.prisma.financialAccount.findMany({
            where,
            orderBy: [{ isDefault: "desc" }, { type: "asc" }, { createdAt: "asc" }],
            include: {
                branch: { select: { id: true, name: true } },
            },
        });
        let totalCash = 0;
        let totalBank = 0;
        let totalBkash = 0;
        let totalNagad = 0;
        let totalMobile = 0;
        let totalOther = 0;
        const bankAccountsList = [];
        for (const acc of accounts) {
            const balance = Number(acc.balance || 0);
            const accType = String(acc.type).toUpperCase();
            const nameLower = (acc.name || "").toLowerCase();
            if (accType === "CASH") {
                totalCash += balance;
            }
            else if (accType === "BANK" || accType === "CARD_SETTLEMENT") {
                totalBank += balance;
                bankAccountsList.push({
                    id: acc.id,
                    name: acc.name,
                    bankName: acc.bankName || acc.name,
                    accountNumber: acc.accountNumber,
                    branchName: acc.branchName,
                    routingNumber: acc.routingNumber,
                    balance,
                    isDefault: acc.isDefault,
                    isActive: acc.isActive,
                });
            }
            else if (accType === "BKASH" || (accType === "MOBILE" && nameLower.includes("bkash")) || nameLower.includes("bkash")) {
                totalBkash += balance;
                totalMobile += balance;
            }
            else if (accType === "NAGAD" || (accType === "MOBILE" && nameLower.includes("nagad")) || nameLower.includes("nagad")) {
                totalNagad += balance;
                totalMobile += balance;
            }
            else if (accType === "MOBILE") {
                totalMobile += balance;
            }
            else {
                totalOther += balance;
            }
        }
        const totalLiquidity = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
        // Fetch total supplier dues from Supplier model
        const supplierWhere = { tenantId, isActive: true };
        const suppliers = await prisma_1.prisma.supplier.findMany({
            where: supplierWhere,
            select: { totalDue: true, dueBalance: true },
        });
        const totalSupplierDues = suppliers.reduce((sum, s) => sum + Number(s.totalDue ?? s.dueBalance ?? 0), 0);
        // Compute period date bounds
        const now = new Date();
        let periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        let periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        if (options?.startDate) {
            const parts = options.startDate.split("-").map(Number);
            if (parts.length === 3)
                periodStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
            else
                periodStart = new Date(options.startDate);
        }
        if (options?.endDate) {
            const parts = options.endDate.split("-").map(Number);
            if (parts.length === 3)
                periodEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
            else {
                const d = new Date(options.endDate);
                d.setHours(23, 59, 59, 999);
                periodEnd = d;
            }
        }
        else if (options?.period === "lastMonth") {
            periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        }
        else if (options?.period === "last6Months") {
            periodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
            periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (options?.period === "thisYear") {
            periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }
        // Query sales for selected period
        const periodSalesWhere = {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: periodStart, lte: periodEnd },
        };
        if (branchId)
            periodSalesWhere.branchId = branchId;
        const periodSales = await prisma_1.prisma.sale.findMany({
            where: periodSalesWhere,
            select: {
                id: true,
                totalAmount: true,
                paidAmount: true,
                paymentMethod: true,
                bankName: true,
                financialAccountId: true,
                notes: true,
                createdAt: true,
            },
        });
        let periodTotalSales = 0;
        let periodCashSales = 0;
        let periodBkashSales = 0;
        let periodNagadSales = 0;
        let periodBankSales = 0;
        let periodOtherSales = 0;
        for (const s of periodSales) {
            const amt = Number(s.paidAmount || s.totalAmount || 0);
            periodTotalSales += amt;
            const pMethod = String(s.paymentMethod || "").toUpperCase();
            const notesLower = (s.notes || "").toLowerCase();
            if (pMethod === "CASH") {
                periodCashSales += amt;
            }
            else if (pMethod === "BKASH" || (pMethod === "MOBILE" && notesLower.includes("bkash"))) {
                periodBkashSales += amt;
            }
            else if (pMethod === "NAGAD" || (pMethod === "MOBILE" && notesLower.includes("nagad"))) {
                periodNagadSales += amt;
            }
            else if (pMethod === "BANK" || pMethod === "CARD") {
                periodBankSales += amt;
            }
            else {
                periodOtherSales += amt;
            }
        }
        // Today's Sales Telemetry & Hourly Breakdown
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const todaySales = await prisma_1.prisma.sale.findMany({
            where: {
                tenantId,
                status: "COMPLETED",
                ...(branchId ? { branchId } : {}),
                createdAt: { gte: todayStart, lte: todayEnd },
            },
            select: { totalAmount: true, paidAmount: true, paymentMethod: true, createdAt: true },
        });
        let todayRevenue = 0;
        let todayCash = 0;
        let todayBkash = 0;
        let todayNagad = 0;
        let todayBank = 0;
        for (const s of todaySales) {
            const amt = Number(s.paidAmount || s.totalAmount || 0);
            todayRevenue += amt;
            const m = String(s.paymentMethod).toUpperCase();
            if (m === "CASH")
                todayCash += amt;
            else if (m === "BKASH")
                todayBkash += amt;
            else if (m === "NAGAD")
                todayNagad += amt;
            else if (m === "BANK" || m === "CARD")
                todayBank += amt;
        }
        const hourlySlots = [
            { label: "8-10 AM", startHour: 8, endHour: 10 },
            { label: "10-12 PM", startHour: 10, endHour: 12 },
            { label: "12-2 PM", startHour: 12, endHour: 14 },
            { label: "2-4 PM", startHour: 14, endHour: 16 },
            { label: "4-6 PM", startHour: 16, endHour: 18 },
            { label: "6-8 PM", startHour: 18, endHour: 20 },
            { label: "8-10 PM", startHour: 20, endHour: 22 },
            { label: "Night", startHour: 22, endHour: 24 },
        ];
        const todayHourly = hourlySlots.map((slot) => {
            const slotSales = todaySales.filter((s) => {
                const hour = new Date(s.createdAt).getHours();
                return hour >= slot.startHour && hour < slot.endHour;
            });
            const revenue = slotSales.reduce((acc, s) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
            return {
                label: slot.label,
                revenue,
                salesCount: slotSales.length,
            };
        });
        // 7-Day Trend
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            const dSales = await prisma_1.prisma.sale.findMany({
                where: {
                    tenantId,
                    status: "COMPLETED",
                    ...(branchId ? { branchId } : {}),
                    createdAt: { gte: dayStart, lte: dayEnd },
                },
                select: { totalAmount: true, paidAmount: true, paymentMethod: true },
            });
            const dayRevenue = dSales.reduce((acc, s) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
            let dayCash = 0;
            let dayDigital = 0;
            for (const s of dSales) {
                const amt = Number(s.paidAmount || s.totalAmount || 0);
                if (s.paymentMethod === "CASH")
                    dayCash += amt;
                else
                    dayDigital += amt;
            }
            last7Days.push({
                date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                dayName: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
                dateKey: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`,
                revenue: dayRevenue,
                orderCount: dSales.length,
                cashAmount: dayCash,
                digitalAmount: dayDigital,
            });
        }
        // Build 30-Day Daily Sales Trend
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            const dSales = await prisma_1.prisma.sale.findMany({
                where: {
                    tenantId,
                    status: "COMPLETED",
                    ...(branchId ? { branchId } : {}),
                    createdAt: { gte: dayStart, lte: dayEnd },
                },
                select: { totalAmount: true, paidAmount: true, paymentMethod: true },
            });
            const dayRevenue = dSales.reduce((acc, s) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
            last30Days.push({
                date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                dayName: dayStart.toLocaleDateString("en-US", { weekday: "narrow" }),
                dateKey: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`,
                revenue: dayRevenue,
                orderCount: dSales.length,
            });
        }
        // Build 6-Month Sales Trend
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1, 0, 0, 0, 0);
            const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const mSales = await prisma_1.prisma.sale.findMany({
                where: {
                    tenantId,
                    status: "COMPLETED",
                    ...(branchId ? { branchId } : {}),
                    createdAt: { gte: mStart, lte: mEnd },
                },
                select: {
                    totalAmount: true,
                    paidAmount: true,
                    paymentMethod: true,
                },
            });
            let mRevenue = 0;
            let mCash = 0;
            let mDigital = 0;
            for (const s of mSales) {
                const amt = Number(s.paidAmount || s.totalAmount || 0);
                mRevenue += amt;
                if (s.paymentMethod === "CASH")
                    mCash += amt;
                else
                    mDigital += amt;
            }
            monthlyTrend.push({
                month: mStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                monthShort: mStart.toLocaleDateString("en-US", { month: "short" }),
                monthKey: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, "0")}`,
                revenue: mRevenue,
                salesCount: mSales.length,
                cashAmount: mCash,
                digitalAmount: mDigital,
            });
        }
        // Recent Financial Ledger (Audit Trail)
        const recentLedger = await prisma_1.prisma.financialTransaction.findMany({
            where: { tenantId, ...(branchId ? { branchId } : {}) },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                sourceAccount: { select: { id: true, name: true, type: true, bankName: true, accountNumber: true } },
                destinationAccount: { select: { id: true, name: true, type: true, bankName: true, accountNumber: true } },
                user: { select: { id: true, name: true, username: true } },
            },
        });
        return {
            summary: {
                totalSales: periodTotalSales,
                cashSales: periodCashSales,
                bkashSales: periodBkashSales,
                nagadSales: periodNagadSales,
                bankSales: periodBankSales,
                otherSales: periodOtherSales,
                totalTransactions: periodSales.length,
                totalSupplierDues,
                currentCashBalance: totalCash,
                currentBkashBalance: totalBkash,
                currentNagadBalance: totalNagad,
                currentBankBalance: totalBank,
                totalLiquidity,
                todayRevenue,
                todaySalesCount: todaySales.length,
                todayCash,
                todayBkash,
                todayNagad,
                todayBank,
            },
            paymentBreakdown: {
                cash: periodCashSales,
                bkash: periodBkashSales,
                nagad: periodNagadSales,
                bank: periodBankSales,
                other: periodOtherSales,
                grandTotal: periodTotalSales,
            },
            bankAccounts: bankAccountsList,
            todayHourly,
            last7Days,
            last30Days,
            monthlyTrend,
            recentLedger,
            accounts: accounts.map((a) => ({
                id: a.id,
                name: a.name,
                type: a.type,
                bankName: a.bankName,
                accountNumber: a.accountNumber,
                branchName: a.branchName,
                routingNumber: a.routingNumber,
                isDefault: a.isDefault,
                isActive: a.isActive,
                description: a.description,
                balance: Number(a.balance),
                branchId: a.branchId,
                branchNameStr: a.branch?.name,
            })),
        };
    }
}
exports.AccountingService = AccountingService;
