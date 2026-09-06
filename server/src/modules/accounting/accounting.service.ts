import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import {
  CreateAccountInput,
  UpdateAccountInput,
  DepositFundsInput,
  TransferFundsInput,
  RecordTransactionInput,
  ListTransactionsQuery,
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
  RecordExpensePaymentInput,
  ListExpensesQuery,
  SetSalaryConfigInput,
  DisburseSalaryInput,
} from "./accounting.validation";
import { AttendanceService } from "../attendance/attendance.service";

export class AccountingService {
  /**
   * List all financial accounts for a tenant / branch with live metadata.
   * Only returns accounts actually created by the pharmacy — no auto-seeding.
   */
  static async listAccounts(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    const accounts = await (prisma as any).financialAccount.findMany({
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
  static async createAccount(tenantId: string, userId: string, data: CreateAccountInput) {
    const account = await (prisma as any).financialAccount.create({
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
      await (prisma as any).financialTransaction.create({
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

    await AuditService.log({
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
  static async updateAccount(tenantId: string, accountId: string, userId: string, data: UpdateAccountInput) {
    const existing = await (prisma as any).financialAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!existing) throw new Error("Financial account not found");

    const updated = await (prisma as any).financialAccount.update({
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

    await AuditService.log({
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
  static async deleteAccount(tenantId: string, accountId: string, userId: string) {
    const existing = await (prisma as any).financialAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!existing) throw new Error("Financial account not found");

    if (Number(existing.balance) > 0) {
      throw new Error(
        `Cannot remove account "${existing.name}" because it still has an active balance of ৳${Number(existing.balance).toFixed(2)}. Please transfer or withdraw the balance to ৳0 first.`
      );
    }

    const deactivated = await (prisma as any).financialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    await AuditService.log({
      tenantId,
      branchId: existing.branchId,
      userId,
      action: "ACCOUNT_DEACTIVATED",
      details: { accountId, name: existing.name, type: existing.type },
    });

    return deactivated;
  }

  /**
   * Deposit money into a financial account (atomic balance increment + transaction entry)
   */
  static async depositFunds(tenantId: string, userId: string, data: DepositFundsInput) {
    const account = await (prisma as any).financialAccount.findFirst({
      where: { id: data.accountId, tenantId, isActive: true },
    });

    if (!account) {
      throw new Error("Financial account not found or inactive");
    }

    const depositAmount = Number(data.amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      throw new Error("Deposit amount must be greater than 0");
    }

    const noteText = data.description?.trim() || `Deposit into ${account.name}`;
    const refCode = `DEP-${Date.now().toString().slice(-6)}`;

    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Increment financial account balance
      const updatedAccount = await tx.financialAccount.update({
        where: { id: account.id },
        data: { balance: { increment: depositAmount } },
        include: {
          branch: { select: { id: true, name: true } },
        },
      });

      // 2. Create financial transaction record in ledger
      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: account.branchId,
          destinationAccountId: account.id,
          amount: depositAmount,
          type: "INCOME",
          reference: refCode,
          note: noteText,
          userId,
        },
      });

      return { account: updatedAccount, transaction };
    });

    await AuditService.log({
      tenantId,
      branchId: account.branchId,
      userId,
      action: "ACCOUNT_DEPOSIT",
      details: {
        accountId: account.id,
        accountName: account.name,
        amount: depositAmount,
        note: noteText,
      },
    });

    return result.account;
  }

  /**
   * Transfer funds between two accounts (Double-entry transfer ledger)
   */
  static async transferFunds(tenantId: string, userId: string, data: TransferFundsInput) {
    if (data.sourceAccountId === data.destinationAccountId) {
      throw new Error("Source and destination accounts must be different");
    }

    const [sourceAcc, destAcc] = await Promise.all([
      (prisma as any).financialAccount.findFirst({
        where: { id: data.sourceAccountId, tenantId },
      }),
      (prisma as any).financialAccount.findFirst({
        where: { id: data.destinationAccountId, tenantId },
      }),
    ]);

    if (!sourceAcc) throw new Error("Source financial account not found");
    if (!destAcc) throw new Error("Destination financial account not found");

    if (Number(sourceAcc.balance) < data.amount) {
      throw new Error(`Insufficient funds in ${sourceAcc.name}. Current balance: ৳${Number(sourceAcc.balance).toFixed(2)}`);
    }

    const result = await (prisma as any).$transaction(async (tx: any) => {
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

    await AuditService.log({
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
  static async recordIncomeExpense(tenantId: string, userId: string, data: RecordTransactionInput) {
    const account = await (prisma as any).financialAccount.findFirst({
      where: { id: data.accountId, tenantId },
    });

    if (!account) throw new Error("Financial account not found");

    if (data.type === "EXPENSE" && Number(account.balance) < data.amount) {
      throw new Error(`Insufficient funds in ${account.name}. Current balance: ৳${Number(account.balance).toFixed(2)}`);
    }

    const result = await (prisma as any).$transaction(async (tx: any) => {
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

    await AuditService.log({
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
  static async listTransactions(tenantId: string, query: ListTransactionsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

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
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, transactions] = await Promise.all([
      (prisma as any).financialTransaction.count({ where }),
      (prisma as any).financialTransaction.findMany({
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

  static async getFinancialOverview(
    tenantId: string,
    branchId?: string,
    options?: { startDate?: string; endDate?: string; period?: string }
  ) {
    const where: any = { tenantId, isActive: true };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }

    const accounts = await (prisma as any).financialAccount.findMany({
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

    const bankAccountsList: any[] = [];

    for (const acc of accounts) {
      const balance = Number(acc.balance || 0);
      const accType = String(acc.type).toUpperCase();
      const nameLower = (acc.name || "").toLowerCase();

      if (accType === "CASH") {
        totalCash += balance;
      } else if (accType === "BANK" || accType === "CARD_SETTLEMENT") {
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
      } else if (accType === "BKASH" || (accType === "MOBILE" && nameLower.includes("bkash")) || nameLower.includes("bkash")) {
        totalBkash += balance;
        totalMobile += balance;
      } else if (accType === "NAGAD" || (accType === "MOBILE" && nameLower.includes("nagad")) || nameLower.includes("nagad")) {
        totalNagad += balance;
        totalMobile += balance;
      } else if (accType === "MOBILE") {
        totalMobile += balance;
      } else {
        totalOther += balance;
      }
    }

    const totalLiquidity = accounts.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0);

    // Compute period date bounds
    const now = new Date();
    let periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    let periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (options?.startDate) {
      const parts = options.startDate.split("-").map(Number);
      if (parts.length === 3) periodStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      else periodStart = new Date(options.startDate);
    }
    if (options?.endDate) {
      const parts = options.endDate.split("-").map(Number);
      if (parts.length === 3) periodEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      else {
        const d = new Date(options.endDate);
        d.setHours(23, 59, 59, 999);
        periodEnd = d;
      }
    } else if (options?.period === "lastMonth") {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (options?.period === "last6Months") {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (options?.period === "thisYear") {
      periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    // Dynamically calculate total supplier dues from actual purchase/due records for active branch and selected period
    const purchaseWhere: any = {
      tenantId,
      dueAmount: { gt: 0 },
    };
    if (branchId) {
      purchaseWhere.branchId = branchId;
    }
    if (options?.startDate || options?.endDate || options?.period) {
      purchaseWhere.purchaseDate = { gte: periodStart, lte: periodEnd };
    }

    const unpaidPurchases = await (prisma as any).purchase.findMany({
      where: purchaseWhere,
      select: { dueAmount: true },
    });

    let totalSupplierDues = unpaidPurchases.reduce(
      (sum: number, p: any) => sum + Number(p.dueAmount || 0),
      0
    );

    // Fallback if no purchase records found and no specific branch/period filter was applied
    if (totalSupplierDues === 0 && !branchId && !options?.startDate && !options?.endDate && !options?.period) {
      const suppliers = await (prisma as any).supplier.findMany({
        where: { tenantId, isActive: true },
        select: { totalDue: true, dueBalance: true },
      });
      totalSupplierDues = suppliers.reduce(
        (sum: number, s: any) => sum + Number(s.totalDue ?? s.dueBalance ?? 0),
        0
      );
    }

    // Query sales for selected period
    const periodSalesWhere: any = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    if (branchId) periodSalesWhere.branchId = branchId;

    const periodSales = await (prisma as any).sale.findMany({
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
      } else if (pMethod === "BKASH" || (pMethod === "MOBILE" && notesLower.includes("bkash"))) {
        periodBkashSales += amt;
      } else if (pMethod === "NAGAD" || (pMethod === "MOBILE" && notesLower.includes("nagad"))) {
        periodNagadSales += amt;
      } else if (pMethod === "BANK" || pMethod === "CARD") {
        periodBankSales += amt;
      } else {
        periodOtherSales += amt;
      }
    }

    // Today's Sales Telemetry & Hourly Breakdown
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todaySales = await (prisma as any).sale.findMany({
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
      if (m === "CASH") todayCash += amt;
      else if (m === "BKASH") todayBkash += amt;
      else if (m === "NAGAD") todayNagad += amt;
      else if (m === "BANK" || m === "CARD") todayBank += amt;
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
      const slotSales = todaySales.filter((s: any) => {
        const hour = new Date(s.createdAt).getHours();
        return hour >= slot.startHour && hour < slot.endHour;
      });
      const revenue = slotSales.reduce((acc: number, s: any) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
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

      const dSales = await (prisma as any).sale.findMany({
        where: {
          tenantId,
          status: "COMPLETED",
          ...(branchId ? { branchId } : {}),
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        select: { totalAmount: true, paidAmount: true, paymentMethod: true },
      });

      const dayRevenue = dSales.reduce((acc: number, s: any) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
      let dayCash = 0;
      let dayDigital = 0;
      for (const s of dSales) {
        const amt = Number(s.paidAmount || s.totalAmount || 0);
        if (s.paymentMethod === "CASH") dayCash += amt;
        else dayDigital += amt;
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

      const dSales = await (prisma as any).sale.findMany({
        where: {
          tenantId,
          status: "COMPLETED",
          ...(branchId ? { branchId } : {}),
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        select: { totalAmount: true, paidAmount: true, paymentMethod: true },
      });

      const dayRevenue = dSales.reduce((acc: number, s: any) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);

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

      const mSales = await (prisma as any).sale.findMany({
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
        if (s.paymentMethod === "CASH") mCash += amt;
        else mDigital += amt;
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
    const recentLedger = await (prisma as any).financialTransaction.findMany({
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
      accounts: accounts.map((a: any) => ({
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

  // ==========================================
  // 🏢 RECURRING EXPENSE BILLS (RENT, ELECTRICITY, ETC)
  // ==========================================
  static async listRecurringExpenses(tenantId: string, branchId?: string, includeInactive = false) {
    const where: any = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }
    if (branchId) where.branchId = branchId;

    return (prisma as any).recurringExpenseConfig.findMany({
      where,
      orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }],
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  static async createRecurringExpense(tenantId: string, data: CreateRecurringExpenseInput) {
    return (prisma as any).recurringExpenseConfig.create({
      data: {
        tenantId,
        branchId: data.branchId,
        category: data.category,
        title: data.title.trim(),
        estimatedAmount: data.estimatedAmount || 0,
        dueDay: data.dueDay || null,
        notes: data.notes?.trim() || null,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  static async updateRecurringExpense(tenantId: string, id: string, data: UpdateRecurringExpenseInput) {
    const existing = await (prisma as any).recurringExpenseConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new Error("Recurring expense configuration not found");

    return (prisma as any).recurringExpenseConfig.update({
      where: { id },
      data: {
        ...(data.category && { category: data.category }),
        ...(data.title && { title: data.title.trim() }),
        ...(data.estimatedAmount !== undefined && { estimatedAmount: data.estimatedAmount }),
        ...(data.dueDay !== undefined && { dueDay: data.dueDay }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async deleteRecurringExpense(tenantId: string, id: string) {
    const existing = await (prisma as any).recurringExpenseConfig.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new Error("Recurring expense configuration not found");

    try {
      return await (prisma as any).recurringExpenseConfig.delete({
        where: { id },
      });
    } catch {
      return (prisma as any).recurringExpenseConfig.update({
        where: { id },
        data: { isActive: false },
      });
    }
  }

  // ==========================================
  // 💸 ACTUAL MONTHLY EXPENSE PAYMENTS
  // ==========================================
  static async listExpenses(tenantId: string, query: ListExpensesQuery) {
    const where: any = { tenantId };

    const isVal = (val: any) => val !== undefined && val !== null && String(val).trim() !== "" && String(val) !== "undefined" && String(val) !== "null" && String(val) !== "ALL";

    if (isVal(query.branchId)) where.branchId = query.branchId;
    if (isVal(query.category)) where.category = query.category;
    if (isVal(query.recurringConfigId)) where.recurringConfigId = query.recurringConfigId;
    if (isVal(query.financialAccountId)) where.financialAccountId = query.financialAccountId;
    if (isVal(query.expenseMonth)) where.expenseMonth = query.expenseMonth;

    if (isVal(query.startDate) || isVal(query.endDate)) {
      where.paymentDate = {};
      if (isVal(query.startDate)) where.paymentDate.gte = new Date(query.startDate!);
      if (isVal(query.endDate)) {
        const end = new Date(query.endDate!);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 100;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (prisma as any).branchExpense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
          financialAccount: { select: { id: true, name: true, type: true, accountNumber: true, bankName: true } },
          recordedBy: { select: { id: true, name: true, username: true } },
          recurringConfig: { select: { id: true, title: true, estimatedAmount: true } },
        },
      }),
      (prisma as any).branchExpense.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async recordExpense(tenantId: string, userId: string, data: RecordExpensePaymentInput) {
    // 1. Verify financial account belongs to this branch and tenant
    const account = await (prisma as any).financialAccount.findFirst({
      where: { id: data.financialAccountId, branchId: data.branchId, tenantId, isActive: true },
    });

    if (!account) {
      throw new Error("Invalid or inactive financial account selected for this branch.");
    }

    if (Number(account.balance) < data.amount) {
      throw new Error(
        `Insufficient balance in financial account "${account.name}". Current Balance: ৳${Number(account.balance).toLocaleString()}, Required: ৳${data.amount.toLocaleString()}`
      );
    }

    return (prisma as any).$transaction(async (tx: any) => {
      // 2. Decrement account balance
      await tx.financialAccount.update({
        where: { id: data.financialAccountId },
        data: {
          balance: { decrement: data.amount },
        },
      });

      const configId = (data.recurringConfigId && data.recurringConfigId.trim() !== "") ? data.recurringConfigId : null;

      // 3. Create expense record
      const expense = await tx.branchExpense.create({
        data: {
          tenantId,
          branchId: data.branchId,
          financialAccountId: data.financialAccountId,
          recurringConfigId: configId,
          category: data.category,
          title: data.title.trim(),
          expenseMonth: data.expenseMonth,
          amount: data.amount,
          voucherNo: data.voucherNo?.trim() || null,
          reference: data.reference?.trim() || null,
          notes: data.notes?.trim() || null,
          recordedById: userId,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
        include: {
          financialAccount: true,
          branch: true,
        },
      });

      // 4. Create financial transaction
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          sourceAccountId: data.financialAccountId,
          amount: data.amount,
          type: "EXPENSE",
          reference: data.voucherNo || data.reference || expense.id,
          note: `[Expense: ${data.category.replace(/_/g, " ")}] ${data.title} (${data.expenseMonth}) paid from ${account.name}`,
          userId,
        },
      });

      await AuditService.log({
        tenantId,
        branchId: data.branchId,
        userId,
        action: "EXPENSE_RECORDED",
        details: {
          expenseId: expense.id,
          branchId: data.branchId,
          category: data.category,
          title: data.title,
          amount: data.amount,
          account: account.name,
          month: data.expenseMonth,
        },
      });

      return expense;
    });
  }

  static async getExpenseSummary(tenantId: string, branchId?: string, month?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (month) where.expenseMonth = month;

    const expenses = await (prisma as any).branchExpense.findMany({
      where,
      select: {
        category: true,
        title: true,
        amount: true,
        recurringConfigId: true,
      },
    });

    let shopRent = 0;
    let electricityBill = 0;
    let employeeSalary = 0;
    let otherExpenses = 0;
    let totalExpenses = 0;

    const categoryBreakdown: Record<string, number> = {};
    const billWiseBreakdown: Record<string, { title: string; category: string; totalAmount: number; count: number }> = {};

    for (const exp of expenses) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + amt;

      if (exp.category === "SHOP_RENT") shopRent += amt;
      else if (exp.category === "ELECTRICITY_BILL") electricityBill += amt;
      else if (exp.category === "EMPLOYEE_SALARY") employeeSalary += amt;
      else otherExpenses += amt;

      const key = exp.title.trim();
      if (!billWiseBreakdown[key]) {
        billWiseBreakdown[key] = { title: exp.title, category: exp.category, totalAmount: 0, count: 0 };
      }
      billWiseBreakdown[key].totalAmount += amt;
      billWiseBreakdown[key].count += 1;
    }

    return {
      shopRent,
      electricityBill,
      employeeSalary,
      otherExpenses,
      totalExpenses,
      categoryBreakdown,
      billWiseBreakdown: Object.values(billWiseBreakdown),
      count: expenses.length,
    };
  }

  // ==========================================
  // 👥 STAFF SALARY MANAGEMENT & PAYROLL
  // ==========================================
  static async listBranchStaffSalaries(tenantId: string, branchId: string, month: string, includeInactive = false) {
    // Fetch branch-assigned staff only, explicitly excluding Company Owner and Super Admin
    const where: any = {
      tenantId,
      branchId,
      role: {
        notIn: ["COMPANY_OWNER", "SUPER_ADMIN"],
      },
    };
    if (!includeInactive) {
      where.isActive = true;
    }

    const users = await (prisma as any).user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
        avatarUrl: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        salaryConfig: true,
        isActive: true,
        resignationDate: true,
        resignationReason: true,
        deactivatedAt: true,
        salaryDisbursements: {
          where: { month },
          include: {
            financialAccount: { select: { id: true, name: true, type: true } },
            disbursedBy: { select: { id: true, name: true, username: true } },
          },
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: [{ name: "asc" }, { username: "asc" }],
    });

    return Promise.all(
      users.map(async (u: any) => {
        let calc: any = null;
        try {
          calc = await AttendanceService.calculateMonthlySalary(tenantId, branchId, u.id, month);
        } catch {
          // fallback
        }

        const config = u.salaryConfig;
        const baseSalary = calc ? calc.metrics.baseSalary : Number(config?.baseSalary || 0);
        const allowances = calc ? calc.metrics.totalAllowances : Number(config?.allowances || 0);
        const deductions = calc ? calc.metrics.totalDeductions : Number(config?.deductions || 0);
        const netSalary = calc ? calc.metrics.finalPayable : Number(config?.netSalary || (baseSalary + allowances - deductions));

        const disbursements = u.salaryDisbursements || [];
        const paidAmount = disbursements.reduce((sum: number, d: any) => sum + Number(d.paidAmount || 0), 0);
        const dueAmount = Math.max(0, Number((netSalary - paidAmount).toFixed(2)));

        let status: "PAID" | "PARTIAL" | "DUE" = "DUE";
        if (netSalary > 0 && paidAmount >= netSalary) {
          status = "PAID";
        } else if (paidAmount > 0) {
          status = "PARTIAL";
        } else {
          status = "DUE";
        }

        return {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          phone: u.phone,
          role: u.role,
          customRoleName: u.customRoleName,
          pharmacyRoleName: u.pharmacyRoleName,
          avatarUrl: u.avatarUrl,
          branchId: u.branchId,
          branchName: u.branch?.name,
          createdAt: u.createdAt,
          isActive: u.isActive,
          resignationDate: u.resignationDate,
          resignationReason: u.resignationReason,
          deactivatedAt: u.deactivatedAt,
          salaryConfig: config
            ? {
                id: config.id,
                baseSalary,
                allowances,
                deductions,
                netSalary,
                paymentMethod: config.paymentMethod,
                paymentDetails: config.paymentDetails,
                effectiveDate: config.effectiveDate,
                notes: config.notes,
              }
            : null,
          attendanceMetrics: calc?.metrics || null,
          monthStatus: {
            month,
            baseSalary,
            workingDays: calc?.metrics?.totalWorkingDays ?? 0,
            offDays: calc?.metrics?.offDays ?? 0,
            totalDays: calc?.metrics?.totalDays ?? 0,
            presentDays: calc?.metrics?.presentDays ?? 0,
            absentDays: calc?.metrics?.absentDays ?? 0,
            unpaidLeaveDays: calc?.metrics?.unpaidLeaveDays ?? 0,
            paidLeaveDays: calc?.metrics?.paidLeaveDays ?? 0,
            dailyRate: calc?.metrics?.dailyRate ?? 0,
            attendanceDeduction: calc?.metrics?.attendanceDeduction ?? 0,
            totalAllowances: calc?.metrics?.totalAllowances ?? 0,
            netSalary,
            paidAmount,
            dueAmount,
            status,
            disbursements,
          },
        };
      })
    );
  }

  static async setSalaryConfig(tenantId: string, data: SetSalaryConfigInput) {
    const netSalary = data.baseSalary + (data.allowances || 0) - (data.deductions || 0);

    const user = await (prisma as any).user.findFirst({
      where: { id: data.userId, tenantId },
    });
    if (!user) throw new Error("Staff member not found in this pharmacy.");

    return (prisma as any).employeeSalaryConfig.upsert({
      where: { userId: data.userId },
      update: {
        branchId: data.branchId,
        baseSalary: data.baseSalary,
        allowances: data.allowances || 0,
        deductions: data.deductions || 0,
        netSalary,
        paymentMethod: data.paymentMethod || null,
        paymentDetails: data.paymentDetails?.trim() || null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        notes: data.notes?.trim() || null,
      },
      create: {
        tenantId,
        branchId: data.branchId,
        userId: data.userId,
        baseSalary: data.baseSalary,
        allowances: data.allowances || 0,
        deductions: data.deductions || 0,
        netSalary,
        paymentMethod: data.paymentMethod || null,
        paymentDetails: data.paymentDetails?.trim() || null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        notes: data.notes?.trim() || null,
      },
    });
  }

  static async disburseSalary(tenantId: string, disbursedById: string, data: DisburseSalaryInput) {
    // 1. Verify employee belongs to tenant & branch
    const employee = await (prisma as any).user.findFirst({
      where: { id: data.userId, tenantId, branchId: data.branchId },
      include: { salaryConfig: true },
    });
    if (!employee) throw new Error("Employee not found in this branch.");

    // 2. Verify financial account belongs to branch & has funds
    const account = await (prisma as any).financialAccount.findFirst({
      where: { id: data.financialAccountId, branchId: data.branchId, tenantId, isActive: true },
    });
    if (!account) throw new Error("Invalid or inactive financial account selected for salary payment.");

    if (Number(account.balance) < data.paidAmount) {
      throw new Error(
        `Insufficient balance in account "${account.name}". Current Balance: ৳${Number(account.balance).toLocaleString()}, Required: ৳${data.paidAmount.toLocaleString()}`
      );
    }

    // 3. Compute salary figures with attendance calculation
    let calc: any = null;
    try {
      calc = await AttendanceService.calculateMonthlySalary(tenantId, data.branchId, data.userId, data.month);
    } catch (e) {
      console.error("Attendance calculation error during disbursement", e);
    }

    const config = employee.salaryConfig;
    const baseAmount = calc ? calc.metrics.baseSalary : Number(config?.baseSalary || data.paidAmount);
    const allowances = calc ? calc.metrics.totalAllowances : Number(config?.allowances || 0);
    const deductions = calc ? calc.metrics.totalDeductions : Number(config?.deductions || 0);
    const netPayable = calc ? calc.metrics.finalPayable : Number(config?.netSalary || (baseAmount + allowances - deductions));

    // Previous payments this month
    const previousDisbursements = await (prisma as any).salaryDisbursement.findMany({
      where: { tenantId, userId: data.userId, month: data.month },
    });
    const priorPaid = previousDisbursements.reduce((sum: number, d: any) => sum + Number(d.paidAmount || 0), 0);
    const totalPaidNow = priorPaid + data.paidAmount;
    const dueAmount = Math.max(0, Number((netPayable - totalPaidNow).toFixed(2)));
    const status = dueAmount === 0 ? "PAID" : "PARTIAL";

    return (prisma as any).$transaction(async (tx: any) => {
      // Debit account
      await tx.financialAccount.update({
        where: { id: data.financialAccountId },
        data: {
          balance: { decrement: data.paidAmount },
        },
      });

      // Create salary disbursement record with immutable attendance snapshot
      const disbursement = await tx.salaryDisbursement.create({
        data: {
          tenantId,
          branchId: data.branchId,
          userId: data.userId,
          financialAccountId: data.financialAccountId,
          month: data.month,
          baseAmount,
          allowances,
          deductions,
          netPayable,
          paidAmount: data.paidAmount,
          dueAmount,
          status,
          totalDays: calc?.metrics.totalDays ?? null,
          offDays: calc?.metrics.offDays ?? null,
          workingDays: calc?.metrics.totalWorkingDays ?? null,
          presentDays: calc?.metrics.presentDays ?? null,
          absentDays: calc?.metrics.absentDays ?? null,
          paidLeaveDays: calc?.metrics.paidLeaveDays ?? null,
          unpaidLeaveDays: calc?.metrics.unpaidLeaveDays ?? null,
          dailyRate: calc?.metrics.dailyRate ?? null,
          attendanceDeduction: calc?.metrics.attendanceDeduction ?? null,
          allowanceBreakdown: calc?.monthlyAllowances ?? null,
          paymentRef: data.paymentRef?.trim() || null,
          notes: data.notes?.trim() || null,
          disbursedById,
          paymentDate: new Date(),
        },
        include: {
          financialAccount: true,
          user: true,
        },
      });

      // Also record as expense under BranchExpense so monthly expenses include salary
      await tx.branchExpense.create({
        data: {
          tenantId,
          branchId: data.branchId,
          financialAccountId: data.financialAccountId,
          category: "EMPLOYEE_SALARY",
          title: `Salary - ${employee.name || employee.username}`,
          expenseMonth: data.month,
          amount: data.paidAmount,
          voucherNo: data.paymentRef || disbursement.id,
          notes: `Monthly payroll payment for ${data.month}`,
          recordedById: disbursedById,
          paymentDate: new Date(),
        },
      });

      // Financial transaction audit ledger
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          sourceAccountId: data.financialAccountId,
          amount: data.paidAmount,
          type: "EXPENSE",
          reference: data.paymentRef || disbursement.id,
          note: `[Salary Payment] ${employee.name || employee.username} for ${data.month} paid from ${account.name}`,
          userId: disbursedById,
        },
      });

      await AuditService.log({
        tenantId,
        branchId: data.branchId,
        userId: disbursedById,
        action: "SALARY_DISBURSED",
        details: {
          disbursementId: disbursement.id,
          employeeId: data.userId,
          employeeName: employee.name || employee.username,
          month: data.month,
          paidAmount: data.paidAmount,
          account: account.name,
        },
      });

      return disbursement;
    });
  }

  static async getEmployeeSalaryHistory(tenantId: string, userId: string, requestingUser?: any) {
    const employee = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
        avatarUrl: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        salaryConfig: true,
      },
    });
    if (!employee) throw new Error("Employee not found.");

    if (requestingUser) {
      const isOwnerOrAdmin =
        requestingUser.role === "COMPANY_OWNER" ||
        requestingUser.role === "SUPER_ADMIN" ||
        requestingUser.role === "REGIONAL_ADMIN";

      const isBranchManager =
        requestingUser.role === "BRANCH_MANAGER" ||
        requestingUser.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
        requestingUser.customRoleName?.toLowerCase().includes("branch manager");

      if (isBranchManager && !isOwnerOrAdmin) {
        const reqBranchId = requestingUser.branchId;
        if (reqBranchId && employee.branchId && employee.branchId !== reqBranchId) {
          throw new Error("Access denied: You can only view details of employees assigned to your branch.");
        }
      }
    }

    const disbursements = await (prisma as any).salaryDisbursement.findMany({
      where: { tenantId, userId },
      orderBy: { paymentDate: "desc" },
      include: {
        financialAccount: { select: { id: true, name: true, type: true, accountNumber: true, bankName: true } },
        disbursedBy: { select: { id: true, name: true, username: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    const totalDisbursed = disbursements.reduce((sum: number, d: any) => sum + Number(d.paidAmount || 0), 0);

    return {
      employee,
      disbursements,
      summary: {
        totalDisbursed,
        totalPayments: disbursements.length,
      },
    };
  }

  static async getMySalaryHistory(tenantId: string, userId: string) {
    return this.getEmployeeSalaryHistory(tenantId, userId);
  }

  static async getBranchSalaryHistory(
    tenantId: string,
    branchId?: string,
    query?: { month?: string; userId?: string; page?: number; limit?: number }
  ) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (query?.month) where.month = query.month;
    if (query?.userId) where.userId = query.userId;

    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (prisma as any).salaryDisbursement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              phone: true,
              role: true,
              customRoleName: true,
              pharmacyRoleName: true,
            },
          },
          financialAccount: {
            select: { id: true, name: true, type: true, accountNumber: true, bankName: true },
          },
          disbursedBy: {
            select: { id: true, name: true, username: true },
          },
          branch: {
            select: { id: true, name: true },
          },
        },
      }),
      (prisma as any).salaryDisbursement.count({ where }),
    ]);

    const totalDisbursed = items.reduce((sum: number, d: any) => sum + Number(d.paidAmount || 0), 0);

    return {
      items,
      totalDisbursed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
