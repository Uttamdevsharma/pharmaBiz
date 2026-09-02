import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import {
  CreateAccountInput,
  UpdateAccountInput,
  TransferFundsInput,
  RecordTransactionInput,
  ListTransactionsQuery,
} from "./accounting.validation";

export class AccountingService {
  /**
   * Ensure default accounts exist for a branch
   */
  static async ensureDefaultAccounts(tenantId: string, branchId: string) {
    const existingCount = await (prisma as any).financialAccount.count({
      where: { tenantId, branchId },
    });

    if (existingCount === 0) {
      const defaults = [
        { name: "Main Cash Drawer", type: "CASH" },
        { name: "Main Bank Account", type: "BANK" },
        { name: "bKash Merchant Account", type: "MOBILE" },
        { name: "Nagad Merchant Account", type: "MOBILE" },
        { name: "Card / POS Settlement", type: "CARD_SETTLEMENT" },
      ];

      for (const acc of defaults) {
        await (prisma as any).financialAccount.create({
          data: {
            tenantId,
            branchId,
            name: acc.name,
            type: acc.type,
            balance: 0,
            isActive: true,
          },
        });
      }
    }
  }

  /**
   * List all financial accounts for a tenant / branch
   */
  static async listAccounts(tenantId: string, branchId?: string) {
    if (branchId) {
      await this.ensureDefaultAccounts(tenantId, branchId);
    } else {
      const existingCount = await (prisma as any).financialAccount.count({
        where: { tenantId },
      });
      if (existingCount === 0) {
        const firstBranch = await (prisma as any).branch.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: "asc" },
        });
        if (firstBranch) {
          await this.ensureDefaultAccounts(tenantId, firstBranch.id);
        }
      }
    }

    const where: any = { tenantId, isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    const accounts = await (prisma as any).financialAccount.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    return accounts;
  }

  /**
   * Create a new custom financial account / wallet
   */
  static async createAccount(tenantId: string, userId: string, data: CreateAccountInput) {
    const account = await (prisma as any).financialAccount.create({
      data: {
        tenantId,
        branchId: data.branchId,
        name: data.name,
        type: data.type,
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
          note: "Initial opening balance",
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
    if (branchId) {
      await this.ensureDefaultAccounts(tenantId, branchId);
    } else {
      const existingCount = await (prisma as any).financialAccount.count({
        where: { tenantId },
      });
      if (existingCount === 0) {
        const firstBranch = await (prisma as any).branch.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: "asc" },
        });
        if (firstBranch) {
          await this.ensureDefaultAccounts(tenantId, firstBranch.id);
        }
      }
    }

    const where: any = { tenantId, isActive: true };
    if (branchId) where.branchId = branchId;

    const accounts = await (prisma as any).financialAccount.findMany({
      where,
    });

    let totalCash = 0;
    let totalBank = 0;
    let totalMobile = 0;
    let totalCardSettlement = 0;
    let totalOther = 0;

    for (const acc of accounts) {
      const balance = Number(acc.balance || 0);
      switch (acc.type) {
        case "CASH":
          totalCash += balance;
          break;
        case "BANK":
          totalBank += balance;
          break;
        case "MOBILE":
          totalMobile += balance;
          break;
        case "CARD_SETTLEMENT":
          totalCardSettlement += balance;
          break;
        default:
          totalOther += balance;
          break;
      }
    }

    const totalLiquidity = totalCash + totalBank + totalMobile + totalCardSettlement + totalOther;

    // Fetch total supplier dues
    const supplierWhere: any = { tenantId, isActive: true };
    const suppliers = await (prisma as any).supplier.findMany({
      where: supplierWhere,
      select: { dueBalance: true },
    });
    const totalSupplierDues = suppliers.reduce((sum: number, s: any) => sum + Number(s.dueBalance || 0), 0);

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
        paymentMethod: true,
        notes: true,
        createdAt: true,
      },
    });

    let periodTotalSales = 0;
    let periodCashSales = 0;
    let periodBkashSales = 0;
    let periodNagadSales = 0;
    let periodCardSales = 0;
    let periodOtherSales = 0;

    for (const s of periodSales) {
      const amt = Number(s.totalAmount || 0);
      periodTotalSales += amt;
      const notesLower = (s.notes || "").toLowerCase();

      if (s.paymentMethod === "CASH") {
        periodCashSales += amt;
      } else if (s.paymentMethod === "CARD") {
        periodCardSales += amt;
      } else if (s.paymentMethod === "MOBILE") {
        if (notesLower.includes("nagad")) {
          periodNagadSales += amt;
        } else {
          periodBkashSales += amt;
        }
      } else {
        periodOtherSales += amt;
      }
    }

    const periodMobileSales = periodBkashSales + periodNagadSales;
    const periodBankCardSales = periodCardSales;

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
          paymentMethod: true,
        },
      });

      let mRevenue = 0;
      let mCash = 0;
      let mDigital = 0;

      for (const s of mSales) {
        const amt = Number(s.totalAmount || 0);
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
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        sourceAccount: { select: { id: true, name: true, type: true } },
        destinationAccount: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true, username: true } },
      },
    });

    return {
      summary: {
        totalSales: periodTotalSales,
        cashSales: periodCashSales,
        bankCardSales: periodBankCardSales,
        mobileSales: periodMobileSales,
        bkashSales: periodBkashSales,
        nagadSales: periodNagadSales,
        cardSales: periodCardSales,
        otherSales: periodOtherSales,
        totalTransactions: periodSales.length,
        totalSupplierDues,
        currentCashBalance: totalCash,
        currentBankBalance: totalBank,
        currentMobileBalance: totalMobile,
        totalLiquidity,
      },
      paymentBreakdown: {
        cash: periodCashSales,
        bkash: periodBkashSales,
        nagad: periodNagadSales,
        card: periodCardSales,
        other: periodOtherSales,
        grandTotal: periodTotalSales,
      },
      monthlyTrend,
      recentLedger,
      accounts: accounts.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance),
        branchId: a.branchId,
      })),
    };
  }
}
