import { prisma } from "../../app/lib/prisma";
import { ReportDateRangeQuery, VatMisReportQuery } from "./report.validation";

export class ReportService {
  /**
   * Daily Sales Report
   */
  static async getDailySales(
    tenantId: string,
    query: ReportDateRangeQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const today = new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const where: any = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
    };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    const sales = await (prisma as any).sale.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        items: true,
      },
    });

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    const totalDiscounts = sales.reduce((sum: number, s: any) => sum + Number(s.discount), 0);
    const totalTaxes = sales.reduce((sum: number, s: any) => sum + Number(s.tax), 0);
    const totalTransactions = sales.length;

    const paymentMethods = {
      CASH: sales.filter((s: any) => s.paymentMethod === "CASH").reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0),
      CARD: sales.filter((s: any) => s.paymentMethod === "CARD").reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0),
      MOBILE: sales.filter((s: any) => s.paymentMethod === "MOBILE").reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0),
    };

    // Hourly distribution
    const hourlyMap: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = { count: 0, revenue: 0 };

    sales.forEach((s: any) => {
      const hour = new Date(s.createdAt).getHours();
      hourlyMap[hour].count += 1;
      hourlyMap[hour].revenue += Number(s.totalAmount);
    });

    return {
      period: "Daily",
      startDate,
      endDate,
      totalTransactions,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      averageOrderValue: totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
      paymentMethods,
      hourlyBreakdown: hourlyMap,
    };
  }

  /**
   * Weekly Sales Report (Last 7 Days)
   */
  static async getWeeklySales(
    tenantId: string,
    query: ReportDateRangeQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const start = query.startDate ? new Date(query.startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where: any = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    const sales = await (prisma as any).sale.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const dayMap: Record<string, { count: number; revenue: number }> = {};

    sales.forEach((s: any) => {
      const dayKey = new Date(s.createdAt).toISOString().split("T")[0];
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { count: 0, revenue: 0 };
      }
      dayMap[dayKey].count += 1;
      dayMap[dayKey].revenue += Number(s.totalAmount);
    });

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);

    return {
      period: "Weekly",
      startDate: start,
      endDate: end,
      totalTransactions: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      dailyBreakdown: dayMap,
    };
  }

  /**
   * Monthly Sales Report
   */
  static async getMonthlySales(
    tenantId: string,
    query: ReportDateRangeQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const start = query.startDate ? new Date(query.startDate) : new Date(end.getFullYear(), end.getMonth(), 1);

    const where: any = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end },
    };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    const sales = await (prisma as any).sale.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);

    return {
      period: "Monthly",
      startDate: start,
      endDate: end,
      totalTransactions: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageDailyRevenue: Math.round((totalRevenue / 30) * 100) / 100,
    };
  }

  /**
   * Branch-Wise Sales Comparison
   */
  static async getBranchWiseSales(tenantId: string, query: ReportDateRangeQuery) {
    const where: any = {
      tenantId,
      status: "COMPLETED",
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [branches, sales] = await Promise.all([
      (prisma as any).branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, location: true },
      }),
      (prisma as any).sale.findMany({
        where,
        select: { branchId: true, totalAmount: true, status: true },
      }),
    ]);

    const branchStats = branches.map((b: any) => {
      const branchSales = sales.filter((s: any) => s.branchId === b.id);
      const totalRev = branchSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);

      return {
        branchId: b.id,
        branchName: b.name,
        location: b.location,
        transactions: branchSales.length,
        totalRevenue: Math.round(totalRev * 100) / 100,
      };
    });

    return {
      branches: branchStats.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
    };
  }

  /**
   * Region-Wise Sales Report (Growth+ Tier)
   */
  static async getRegionWiseSales(tenantId: string, query: ReportDateRangeQuery) {
    const branches = await (prisma as any).branch.findMany({
      where: { tenantId, isActive: true },
      include: {
        sales: {
          where: {
            status: "COMPLETED",
            ...(query.startDate || query.endDate
              ? {
                  createdAt: {
                    ...(query.startDate && { gte: new Date(query.startDate) }),
                    ...(query.endDate && { lte: new Date(query.endDate) }),
                  },
                }
              : {}),
          },
        },
      },
    });

    const regionMap: Record<string, { branchCount: number; transactionCount: number; revenue: number }> = {};

    branches.forEach((b: any) => {
      const region = b.location || "Default Region";
      if (!regionMap[region]) {
        regionMap[region] = { branchCount: 0, transactionCount: 0, revenue: 0 };
      }
      regionMap[region].branchCount += 1;
      regionMap[region].transactionCount += b.sales.length;
      regionMap[region].revenue += b.sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    });

    return {
      regions: Object.entries(regionMap).map(([region, stats]) => ({
        region,
        branchCount: stats.branchCount,
        transactionCount: stats.transactionCount,
        totalRevenue: Math.round(stats.revenue * 100) / 100,
      })),
    };
  }

  /**
   * Company-Wide Sales & Financial Metrics
   */
  static async getCompanyWideSales(tenantId: string, query: ReportDateRangeQuery) {
    const where: any = { tenantId };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const sales = await (prisma as any).sale.findMany({
      where,
    });

    const completedSales = sales.filter((s: any) => s.status === "COMPLETED");
    const refundedSales = sales.filter((s: any) => s.status === "REFUNDED");
    const voidedSales = sales.filter((s: any) => s.status === "VOIDED");

    const grossRevenue = completedSales.reduce((sum: number, s: any) => sum + Number(s.subTotal), 0);
    const totalDiscounts = completedSales.reduce((sum: number, s: any) => sum + Number(s.discount), 0);
    const totalTaxes = completedSales.reduce((sum: number, s: any) => sum + Number(s.tax), 0);
    const netRevenue = completedSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    const refundedAmount = refundedSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);

    return {
      summary: {
        totalOrders: sales.length,
        completedOrders: completedSales.length,
        refundedOrders: refundedSales.length,
        voidedOrders: voidedSales.length,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTaxes: Math.round(totalTaxes * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        refundedAmount: Math.round(refundedAmount * 100) / 100,
      },
    };
  }

  /**
   * Inventory Valuation & Stock Report
   */
  static async getInventoryReport(
    tenantId: string,
    branchId?: string,
    userRole?: string,
    userBranchId?: string | null
  ) {
    const where: any = {
      product: { tenantId, isActive: true },
      branch: { tenantId, isActive: true },
    };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole || "") && userBranchId) {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const inventories = await (prisma as any).inventory.findMany({
      where,
      include: {
        product: true,
        branch: { select: { id: true, name: true } },
      },
    });

    let totalStockUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let expiredCount = 0;

    const now = new Date();

    inventories.forEach((inv: any) => {
      totalStockUnits += inv.quantity;
      totalValuation += inv.quantity * Number(inv.product.basePrice);
      if (inv.quantity <= (inv.lowStockThreshold || 5)) lowStockCount += 1;
      if (inv.expiryDate && new Date(inv.expiryDate) < now) expiredCount += 1;
    });

    return {
      totalSKUs: inventories.length,
      totalStockUnits,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockSKUs: lowStockCount,
      expiredSKUs: expiredCount,
    };
  }

  /**
   * VAT / MIS Compliance Report
   */
  static async getVatMisReport(tenantId: string, query: VatMisReportQuery) {
    const where: any = {
      tenantId,
      status: "COMPLETED",
    };

    if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const sales = await (prisma as any).sale.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    let taxableSales = 0;
    let totalVatCollected = 0;
    let controlledSalesCount = 0;
    let prescriptionSalesCount = 0;

    sales.forEach((s: any) => {
      totalVatCollected += Number(s.tax);
      if (Number(s.tax) > 0) {
        taxableSales += Number(s.subTotal);
      }
      if (s.managerApprovedBy) controlledSalesCount += 1;
      if (s.prescriptionRef) prescriptionSalesCount += 1;
    });

    return {
      reportType: "VAT & MIS Compliance",
      generatedAt: new Date(),
      totalTransactions: sales.length,
      taxableSalesAmount: Math.round(taxableSales * 100) / 100,
      totalVatCollected: Math.round(totalVatCollected * 100) / 100,
      controlledSubstanceSales: controlledSalesCount,
      prescriptionSales: prescriptionSalesCount,
    };
  }
}
