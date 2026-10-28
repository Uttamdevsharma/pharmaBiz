import { prisma } from "../../app/lib/prisma";
import { ReportDateRangeQuery, VatMisReportQuery } from "./report.validation";

export class ReportService {
  /**
   * Comprehensive Daily & Filterable Sales Report
   */
  /**
   * Helper to parse date string safely in local calendar bounds
   */
  private static parseBoundaryDate(dateStr?: string, isEnd = false): Date {
    if (!dateStr) {
      const now = new Date();
      if (isEnd) return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      if (isEnd) return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    if (isEnd) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Comprehensive Daily & Filterable Sales Report
   */
  static async getDailySales(
    tenantId: string,
    query: ReportDateRangeQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const startDate = this.parseBoundaryDate(query.startDate, false);
    const endDate = query.endDate
      ? this.parseBoundaryDate(query.endDate, true)
      : query.startDate
      ? this.parseBoundaryDate(query.startDate, true)
      : this.parseBoundaryDate(undefined, true);

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

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.categoryId || query.subcategoryId) {
      where.items = {
        some: {
          product: {
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.subcategoryId ? { subcategoryId: query.subcategoryId } : {}),
          },
        },
      };
    }

    const [sales, tenant, targetBranch] = await Promise.all([
      (prisma as any).sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, location: true, phone: true } },
          user: { select: { id: true, name: true, username: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  genericName: true,
                  unit: true,
                  size: true,
                  brandName: true,
                  categoryRef: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, email: true, address: true, logoUrl: true },
      }),
      where.branchId
        ? (prisma as any).branch.findUnique({
            where: { id: where.branchId },
            select: { id: true, name: true, location: true, phone: true, email: true },
          })
        : null,
    ]);

    let totalSubTotal = 0;
    let totalDiscounts = 0;
    let totalTaxes = 0;
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalCostOfGoods = 0;

    const paymentBreakdown = {
      cash: 0,
      bkash: 0,
      nagad: 0,
      card: 0,
      other: 0,
      grandTotal: 0,
    };

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        genericName: string | null;
        category: string;
        unitType: string;
        quantitySold: number;
        lowestUnitQuantitySold: number;
        totalAmount: number;
        totalCost: number;
        averageUnitPrice: number;
        transactionsCount: number;
      }
    >();

    let totalUnitsSold = 0;

    // Hourly distribution
    const hourlyMap: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = { count: 0, revenue: 0 };

    // Day of week distribution (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeekMap: Record<number, { day: string; count: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayOfWeekMap[i] = { day: dayOfWeekNames[i], count: 0, revenue: 0 };
    }

    sales.forEach((s: any) => {
      const saleSubTotal = Number(s.subTotal || 0);
      const saleDiscount = Number(s.discount || 0);
      const saleTax = Number(s.tax || 0);
      const saleTotal = Number(s.totalAmount || 0);
      const salePaid = Number(s.paidAmount !== undefined ? s.paidAmount : saleTotal);
      const saleDue = Number(s.dueAmount || 0);

      totalSubTotal += saleSubTotal;
      totalDiscounts += saleDiscount;
      totalTaxes += saleTax;
      totalRevenue += saleTotal;
      totalPaid += salePaid;
      totalDue += saleDue;

      // Payment Method categorization
      const method = String(s.paymentMethod || "").toUpperCase();
      const note = (s.notes || "").toLowerCase();

      paymentBreakdown.grandTotal += saleTotal;

      if (method === "CASH") {
        paymentBreakdown.cash += saleTotal;
      } else if (method === "BKASH") {
        paymentBreakdown.bkash += saleTotal;
      } else if (method === "NAGAD") {
        paymentBreakdown.nagad += saleTotal;
      } else if (method === "BANK" || method === "CARD") {
        paymentBreakdown.card += saleTotal;
      } else if (method === "MOBILE") {
        if (note.includes("nagad")) {
          paymentBreakdown.nagad += saleTotal;
        } else {
          paymentBreakdown.bkash += saleTotal;
        }
      } else {
        paymentBreakdown.other += saleTotal;
      }

      // Hourly & Day-of-week metric
      const saleDate = new Date(s.createdAt);
      const hour = saleDate.getHours();
      hourlyMap[hour].count += 1;
      hourlyMap[hour].revenue += saleTotal;

      const dayIndex = saleDate.getDay();
      if (dayOfWeekMap[dayIndex]) {
        dayOfWeekMap[dayIndex].count += 1;
        dayOfWeekMap[dayIndex].revenue += saleTotal;
      }

      // Aggregate Product Sales
      (s.items || []).forEach((item: any) => {
        const prod = item.product;
        const pId = item.productId;
        const qty = Number(item.quantity || 0);
        const lowestUnitQty = Number(item.lowestUnitQuantity || qty);
        const itemAmount = Number(item.subTotal || Number(item.unitPrice || 0) * qty);
        const itemCost = item.purchasePrice ? Number(item.purchasePrice) * lowestUnitQty : 0;

        totalUnitsSold += qty;
        totalCostOfGoods += itemCost;

        if (!productMap.has(pId)) {
          productMap.set(pId, {
            productId: pId,
            productName: prod?.name || "Unknown Product",
            sku: prod?.sku || "—",
            genericName: prod?.genericName || null,
            category: prod?.categoryRef?.name || prod?.brandName || "General Medicine",
            unitType: item.unitType || prod?.unit || "Piece",
            quantitySold: 0,
            lowestUnitQuantitySold: 0,
            totalAmount: 0,
            totalCost: 0,
            averageUnitPrice: 0,
            transactionsCount: 0,
          });
        }

        const entry = productMap.get(pId)!;
        entry.quantitySold += qty;
        entry.lowestUnitQuantitySold += lowestUnitQty;
        entry.totalAmount += itemAmount;
        entry.totalCost += itemCost;
        entry.transactionsCount += 1;
      });
    });

    const productSalesList = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        totalAmount: Math.round(p.totalAmount * 100) / 100,
        totalCost: Math.round(p.totalCost * 100) / 100,
        grossProfit: Math.round((p.totalAmount - p.totalCost) * 100) / 100,
        averageUnitPrice:
          p.quantitySold > 0 ? Math.round((p.totalAmount / p.quantitySold) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const transactionList = sales.map((s: any) => {
      const note = (s.notes || "").toLowerCase();
      let paymentDetail = s.paymentMethod;
      if (s.paymentMethod === "MOBILE") {
        paymentDetail = note.includes("nagad") ? "Nagad" : "bKash";
      } else if (s.paymentMethod === "CASH") {
        paymentDetail = "Cash";
      } else if (s.paymentMethod === "CARD") {
        paymentDetail = "Card / POS";
      }

      return {
        id: s.id,
        receiptNo: s.receiptNo,
        customerName: s.customerName || "Walk-in Customer",
        customerPhone: s.customerPhone || null,
        paymentMethod: s.paymentMethod,
        paymentDetail,
        subTotal: Number(s.subTotal),
        discount: Number(s.discount),
        tax: Number(s.tax),
        totalAmount: Number(s.totalAmount),
        paidAmount: Number(s.paidAmount),
        dueAmount: Number(s.dueAmount),
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt,
        cashier: s.user ? { name: s.user.name, username: s.user.username } : null,
        branch: s.branch ? { id: s.branch.id, name: s.branch.name } : null,
        itemsCount: (s.items || []).length,
        items: (s.items || []).map((i: any) => ({
          name: i.product?.name || "Product",
          quantity: i.quantity,
          unitType: i.unitType,
          unitPrice: Number(i.unitPrice),
          subTotal: Number(i.subTotal),
          batchNumber: i.batchNumber,
          categoryId: i.product?.categoryId || i.product?.categoryRef?.id,
          categoryName: i.product?.categoryRef?.name,
          subcategoryId: i.product?.subcategoryId || i.product?.subcategoryRef?.id,
          subcategoryName: i.product?.subcategoryRef?.name,
        })),
      };
    });

    const totalTransactions = sales.length;

    return {
      period: "Daily",
      startDate,
      endDate,
      pharmacy: {
        name: tenant?.name || "Pharmacy Store",
        address: targetBranch?.location || tenant?.address || "Main Branch",
        phone: targetBranch?.phone || tenant?.phone || "—",
        email: targetBranch?.email || tenant?.email || "—",
        logoUrl: tenant?.logoUrl || null,
      },
      branch: targetBranch,
      summary: {
        totalSales: Math.round(totalRevenue * 100) / 100,
        totalSubTotal: Math.round(totalSubTotal * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTaxes: Math.round(totalTaxes * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        transactionCount: totalTransactions,
        totalUnitsSold,
        totalCostOfGoods: Math.round(totalCostOfGoods * 100) / 100,
        grossProfit: Math.round((totalRevenue - totalCostOfGoods) * 100) / 100,
        averageOrderValue:
          totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
      },
      paymentBreakdown: {
        cash: Math.round(paymentBreakdown.cash * 100) / 100,
        bkash: Math.round(paymentBreakdown.bkash * 100) / 100,
        nagad: Math.round(paymentBreakdown.nagad * 100) / 100,
        card: Math.round(paymentBreakdown.card * 100) / 100,
        other: Math.round(paymentBreakdown.other * 100) / 100,
        grandTotal: Math.round(paymentBreakdown.grandTotal * 100) / 100,
      },
      productSales: productSalesList,
      transactions: transactionList,
      hourlyBreakdown: hourlyMap,
      dayOfWeekBreakdown: dayOfWeekMap,
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

  /**
   * Comprehensive Owner/Manager Dashboard Analytics
   * Supports: Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range, and All-Time.
   * Scoped to assigned branch for Branch Managers, or company-wide / selectable for Pharmacy Owner.
   */
  static async getDashboardMetrics(
    tenantId: string,
    branchId?: string,
    userRole?: string,
    userBranchId?: string | null,
    userId?: string,
    period?: string,
    startDate?: string,
    endDate?: string
  ) {
    const isBranchRestricted = ["BRANCH_MANAGER", "MANAGER", "CASHIER", "INVENTORY_EXECUTIVE"].includes(userRole || "");
    let effectiveBranchId: string | undefined = undefined;

    if (isBranchRestricted) {
      if (userBranchId) {
        effectiveBranchId = userBranchId;
      } else if (userId) {
        const dbUser = await (prisma as any).user.findUnique({
          where: { id: userId },
          select: { branchId: true },
        });
        if (dbUser?.branchId) {
          effectiveBranchId = dbUser.branchId;
        }
      }
    } else {
      effectiveBranchId = branchId && branchId !== "all" ? branchId : undefined;
    }

    const now = new Date();
    let rangeStart: Date | undefined;
    let rangeEnd: Date | undefined;
    const activePeriod = period || (startDate || endDate ? "custom" : "30d");

    if (activePeriod === "today") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (activePeriod === "yesterday") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (activePeriod === "7d") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (activePeriod === "30d") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (activePeriod === "this_year" || activePeriod === "year") {
      rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (activePeriod === "custom") {
      if (startDate) {
        rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);
      }
    }

    const saleWhere: any = {
      tenantId,
      status: "COMPLETED",
    };
    if (effectiveBranchId) saleWhere.branchId = effectiveBranchId;
    if (rangeStart || rangeEnd) {
      saleWhere.createdAt = {};
      if (rangeStart) saleWhere.createdAt.gte = rangeStart;
      if (rangeEnd) saleWhere.createdAt.lte = rangeEnd;
    }

    const inventoryWhere: any = {
      branch: { tenantId },
    };
    if (effectiveBranchId) inventoryWhere.branchId = effectiveBranchId;

    // Build transfer loss filter atomically to avoid branch filter being overwritten by date range
    const transferLossWhere: any = {
      product: { tenantId },
      OR: [
        { damagedQuantity: { gt: 0 } },
        { missingQuantity: { gt: 0 } },
      ],
    };
    const transferDateFilter = (rangeStart || rangeEnd) ? {
      createdAt: {
        ...(rangeStart ? { gte: rangeStart } : {}),
        ...(rangeEnd ? { lte: rangeEnd } : {}),
      },
    } : {};
    if (effectiveBranchId) {
      transferLossWhere.transfer = {
        OR: [
          { toBranchId: effectiveBranchId },
          { fromBranchId: effectiveBranchId },
        ],
        ...transferDateFilter,
      };
    } else if (rangeStart || rangeEnd) {
      transferLossWhere.transfer = transferDateFilter;
    }

    const ninetyDaysFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [sales, inventories, accounts, suppliers, allBranches, transferLossItems, directDamageMovements, expenses] = await Promise.all([
      (prisma as any).sale.findMany({
        where: saleWhere,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  categoryId: true,
                  categoryRef: { select: { name: true } },
                  basePrice: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      (prisma as any).inventory.findMany({
        where: inventoryWhere,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              categoryId: true,
              categoryRef: { select: { name: true } },
              basePrice: true,
            },
          },
          branch: { select: { id: true, name: true, location: true } },
        },
      }),
      (prisma as any).financialAccount.findMany({
        where: { tenantId, isActive: true, ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}) },
      }),
      (prisma as any).supplier.findMany({
        where: { tenantId, isActive: true },
        select: { totalDue: true },
      }),
      (prisma as any).branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, location: true },
      }),
      (prisma as any).transferItem.findMany({
        where: transferLossWhere,
        include: {
          transfer: {
            select: {
              id: true,
              fromBranchId: true,
              toBranchId: true,
              transferDate: true,
              createdAt: true,
            },
          },
        },
      }),
      (prisma as any).stockMovement.findMany({
        where: {
          type: "DAMAGE",
          // Scope to tenant's branches to prevent cross-tenant leakage
          ...(effectiveBranchId
            ? { branchId: effectiveBranchId }
            : { inventory: { branch: { tenantId } } }),
          ...(rangeStart || rangeEnd ? {
            createdAt: {
              ...(rangeStart ? { gte: rangeStart } : {}),
              ...(rangeEnd ? { lte: rangeEnd } : {}),
            },
          } : {}),
        },
      }).catch(() => []),
      (prisma as any).branchExpense.findMany({
        where: {
          tenantId,
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
          ...(rangeStart || rangeEnd
            ? {
                paymentDate: {
                  ...(rangeStart ? { gte: rangeStart } : {}),
                  ...(rangeEnd ? { lte: rangeEnd } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          branchId: true,
          category: true,
          amount: true,
          paymentDate: true,
          title: true,
        },
      }).catch(() => []),
    ]);

    const activeBranch = effectiveBranchId ? allBranches.find((b: any) => b.id === effectiveBranchId) : null;

    // Financial & Sales Calculations
    let totalSalesRevenue = 0;
    let totalCostOfSold = 0;

    const paymentBreakdown: Record<string, number> = {
      CASH: 0,
      BKASH: 0,
      NAGAD: 0,
      CARD: 0,
      OTHER: 0,
    };

    const categoryMap: Record<string, { name: string; revenue: number; count: number }> = {};
    const productSalesMap: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};

    // Dynamic Trend Map according to activePeriod
    const dynamicTrendMap: Record<string, { key: string; label: string; sales: number; revenue: number; cost: number; profit: number; expenses: number }> = {};

    if (activePeriod === "today" || activePeriod === "yesterday") {
      // 24 Hourly buckets
      for (let h = 0; h < 24; h++) {
        const hourStr = String(h).padStart(2, "0");
        const hourLabel = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        dynamicTrendMap[hourStr] = { key: hourStr, label: hourLabel, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
      }
    } else if (activePeriod === "7d") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
      }
    } else if (activePeriod === "30d") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
        dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
      }
    } else if (activePeriod === "this_year" || activePeriod === "year") {
      for (let m = 0; m < 12; m++) {
        const monthKey = `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
        const label = new Date(now.getFullYear(), m, 1).toLocaleDateString("en-US", { month: "short" });
        dynamicTrendMap[monthKey] = { key: monthKey, label, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
      }
    } else if (activePeriod === "custom" && rangeStart && rangeEnd) {
      const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 2) {
        for (let h = 0; h < 24; h++) {
          const hourStr = String(h).padStart(2, "0");
          const hourLabel = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
          dynamicTrendMap[hourStr] = { key: hourStr, label: hourLabel, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
        }
      } else if (diffDays > 300) {
        const yr = rangeStart.getFullYear();
        for (let m = 0; m < 12; m++) {
          const monthKey = `${yr}-${String(m + 1).padStart(2, "0")}`;
          const label = new Date(yr, m, 1).toLocaleDateString("en-US", { month: "short" });
          dynamicTrendMap[monthKey] = { key: monthKey, label, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
        }
      } else {
        const stepDays = Math.min(diffDays, 60);
        for (let i = stepDays; i >= 0; i--) {
          const d = new Date(rangeEnd.getTime() - i * 24 * 60 * 60 * 1000);
          if (d >= rangeStart) {
            const dateStr = d.toISOString().split("T")[0];
            const label = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
            dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
          }
        }
      }
    } else {
      // All-time or 6-Month Monthly Trend
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        dynamicTrendMap[key] = { key, label, sales: 0, revenue: 0, cost: 0, profit: 0, expenses: 0 };
      }
    }

    // Branch performance tracker
    const branchStatsMap: Record<string, {
      branchId: string;
      branchName: string;
      location: string;
      stockUnits: number;
      inventoryValue: number;
      salesRevenue: number;
      ordersCount: number;
      costOfSold: number;
      grossProfit: number;
      damagedMissingLoss: number;
      expenses: number;
      netProfit: number;
    }> = {};

    allBranches.forEach((b: any) => {
      branchStatsMap[b.id] = {
        branchId: b.id,
        branchName: b.name,
        location: b.location || "Default",
        stockUnits: 0,
        inventoryValue: 0,
        salesRevenue: 0,
        ordersCount: 0,
        costOfSold: 0,
        grossProfit: 0,
        damagedMissingLoss: 0,
        expenses: 0,
        netProfit: 0,
      };
    });

    sales.forEach((s: any) => {
      const saleAmount = Number(s.totalAmount || 0);
      totalSalesRevenue += saleAmount;

      if (s.branchId && branchStatsMap[s.branchId]) {
        branchStatsMap[s.branchId].salesRevenue += saleAmount;
        branchStatsMap[s.branchId].ordersCount += 1;
      }

      // Payment method
      const rawMethod = String(s.paymentMethod || "CASH").toUpperCase();
      if (rawMethod === "CASH") paymentBreakdown.CASH += saleAmount;
      else if (rawMethod === "BKASH") paymentBreakdown.BKASH += saleAmount;
      else if (rawMethod === "NAGAD") paymentBreakdown.NAGAD += saleAmount;
      else if (rawMethod === "CARD" || rawMethod === "POS") paymentBreakdown.CARD += saleAmount;
      else if (rawMethod === "MOBILE") paymentBreakdown.BKASH += saleAmount;
      else paymentBreakdown.OTHER += saleAmount;

      // Items calculation for COGS, category, and top products
      let saleCost = 0;
      (s.items || []).forEach((item: any) => {
        const itemSub = Number(item.subTotal || item.totalPrice || 0);
        const itemQty = Number(item.quantity || 0);
        // Use lowestUnitQuantity (actual base units deducted) for accurate COGS.
        // purchasePrice is stored per base unit (e.g. per tablet); quantity is package count (strips/boxes).
        // Fallback: if lowestUnitQuantity not set, derive from quantity × unitMultiplier.
        const baseUnits = Number(item.lowestUnitQuantity || (itemQty * Number(item.unitMultiplier || 1)));
        const purchaseP = Number(item.purchasePrice ?? (item.product?.basePrice ?? 0));
        saleCost += purchaseP * baseUnits;

        const catName =
          item.product?.categoryRef?.name ||
          (typeof item.product?.category === "string" ? item.product.category : null) ||
          "Medicine";

        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, revenue: 0, count: 0 };
        }
        categoryMap[catName].revenue += itemSub;
        categoryMap[catName].count += itemQty;

        const pId = item.productId || (item.product?.id || `prod_${item.id}`);
        const pName = item.product?.name || "Product";
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { id: pId, name: pName, quantity: 0, revenue: 0 };
        }
        productSalesMap[pId].quantity += itemQty;
        productSalesMap[pId].revenue += itemSub;
      });

      totalCostOfSold += saleCost;
      if (s.branchId && branchStatsMap[s.branchId]) {
        branchStatsMap[s.branchId].costOfSold += saleCost;
      }

      const saleDate = new Date(s.createdAt);
      const profit = Math.max(0, saleAmount - saleCost);

      if (activePeriod === "today" || activePeriod === "yesterday" || (activePeriod === "custom" && Object.keys(dynamicTrendMap).length === 24)) {
        const hourStr = String(saleDate.getHours()).padStart(2, "0");
        if (dynamicTrendMap[hourStr]) {
          dynamicTrendMap[hourStr].sales += 1;
          dynamicTrendMap[hourStr].revenue += saleAmount;
          dynamicTrendMap[hourStr].cost += saleCost;
          dynamicTrendMap[hourStr].profit += profit;
        }
      } else if (activePeriod === "all" || activePeriod === "this_year" || activePeriod === "year" || (activePeriod === "custom" && Object.keys(dynamicTrendMap).length === 12)) {
        const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
        if (dynamicTrendMap[monthKey]) {
          dynamicTrendMap[monthKey].sales += 1;
          dynamicTrendMap[monthKey].revenue += saleAmount;
          dynamicTrendMap[monthKey].cost += saleCost;
          dynamicTrendMap[monthKey].profit += profit;
        }
      } else {
        const dateKey = saleDate.toISOString().split("T")[0];
        if (dynamicTrendMap[dateKey]) {
          dynamicTrendMap[dateKey].sales += 1;
          dynamicTrendMap[dateKey].revenue += saleAmount;
          dynamicTrendMap[dateKey].cost += saleCost;
          dynamicTrendMap[dateKey].profit += profit;
        }
      }
    });

    // Expenses aggregation
    let totalExpenses = 0;
    (expenses || []).forEach((e: any) => {
      const amt = Number(e.amount || 0);
      totalExpenses += amt;

      if (e.branchId && branchStatsMap[e.branchId]) {
        branchStatsMap[e.branchId].expenses += amt;
      }

      const expDate = new Date(e.paymentDate || e.createdAt);
      if (activePeriod === "today" || activePeriod === "yesterday" || (activePeriod === "custom" && Object.keys(dynamicTrendMap).length === 24)) {
        const hourStr = String(expDate.getHours()).padStart(2, "0");
        if (dynamicTrendMap[hourStr]) {
          dynamicTrendMap[hourStr].expenses += amt;
        }
      } else if (activePeriod === "all" || activePeriod === "this_year" || activePeriod === "year" || (activePeriod === "custom" && Object.keys(dynamicTrendMap).length === 12)) {
        const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, "0")}`;
        if (dynamicTrendMap[monthKey]) {
          dynamicTrendMap[monthKey].expenses += amt;
        }
      } else {
        const dateKey = expDate.toISOString().split("T")[0];
        if (dynamicTrendMap[dateKey]) {
          dynamicTrendMap[dateKey].expenses += amt;
        }
      }
    });

    // Current Inventory Calculations across relevant branches
    let totalStockUnits = 0;
    let totalInventoryCostValue = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;
    let expiredCount = 0;

    const lowStockItems: any[] = [];
    const nearExpiryItems: any[] = [];
    const stockCategoryMap: Record<string, { categoryName: string; stockUnits: number; stockValue: number; itemCount: number }> = {};

    inventories.forEach((inv: any) => {
      const qty = Number(inv.quantity || 0);
      totalStockUnits += qty;
      const unitVal = Number(inv.purchasePrice ?? inv.product?.basePrice ?? 0);
      const lineVal = qty * unitVal;
      totalInventoryCostValue += lineVal;

      // Category Stock Aggregation
      const catName =
        inv.product?.categoryRef?.name ||
        (typeof inv.product?.category === "string" ? inv.product.category : null) ||
        "General Medicine";

      if (!stockCategoryMap[catName]) {
        stockCategoryMap[catName] = { categoryName: catName, stockUnits: 0, stockValue: 0, itemCount: 0 };
      }
      stockCategoryMap[catName].stockUnits += qty;
      stockCategoryMap[catName].stockValue += lineVal;
      stockCategoryMap[catName].itemCount += 1;

      if (inv.branchId && branchStatsMap[inv.branchId]) {
        branchStatsMap[inv.branchId].stockUnits += qty;
        branchStatsMap[inv.branchId].inventoryValue += lineVal;
      }

      const threshold = inv.lowStockThreshold || 10;
      if (qty <= threshold) {
        lowStockCount += 1;
        if (lowStockItems.length < 5) {
          lowStockItems.push({
            id: inv.id,
            productName: inv.product?.name || "Product",
            batchNumber: inv.batchNumber || "BATCH-01",
            quantity: qty,
            threshold,
            rackLocation: inv.shelfLocation || "Shelf A",
          });
        }
      }

      if (inv.expiryDate) {
        const expDate = new Date(inv.expiryDate);
        if (expDate < now) {
          expiredCount += 1;
        } else if (expDate <= ninetyDaysFuture) {
          nearExpiryCount += 1;
          if (nearExpiryItems.length < 5) {
            nearExpiryItems.push({
              id: inv.id,
              productName: inv.product?.name || "Product",
              batchNumber: inv.batchNumber || "BATCH-01",
              expiryDate: inv.expiryDate,
              quantity: qty,
              rackLocation: inv.shelfLocation || "Shelf A",
            });
          }
        }
      }
    });

    const totalInvUnitsForPct = totalStockUnits || 1;
    const stockByCategory = Object.values(stockCategoryMap)
      .map((c) => ({
        ...c,
        stockValue: Math.round(c.stockValue * 100) / 100,
        percentage: Math.round((c.stockUnits / totalInvUnitsForPct) * 1000) / 10,
      }))
      .sort((a, b) => b.stockUnits - a.stockUnits);

    // Total Damaged & Missing Stock Loss calculations for period
    let totalDamagedMissingLoss = 0;
    let damagedMissingUnitsCount = 0;

    transferLossItems.forEach((item: any) => {
      const lineLoss = Number(item.damagedValue || 0) + Number(item.missingValue || 0);
      const lineUnits = Number(item.damagedQuantity || 0) + Number(item.missingQuantity || 0);
      totalDamagedMissingLoss += lineLoss;
      damagedMissingUnitsCount += lineUnits;

      const targetBranchId = item.transfer?.toBranchId || item.transfer?.fromBranchId;
      if (targetBranchId && branchStatsMap[targetBranchId]) {
        branchStatsMap[targetBranchId].damagedMissingLoss += lineLoss;
      }
    });

    directDamageMovements.forEach((mov: any) => {
      const lineLoss = Math.abs(Number(mov.quantity || 0)) * Number(mov.unitPrice || 0);
      totalDamagedMissingLoss += lineLoss;
      damagedMissingUnitsCount += Math.abs(Number(mov.quantity || 0));

      if (mov.branchId && branchStatsMap[mov.branchId]) {
        branchStatsMap[mov.branchId].damagedMissingLoss += lineLoss;
      }
    });

    // Compute Gross Profit & Net Profit:
    // Sales Revenue − Purchase/Cost of Sold Products = Gross Profit
    // Gross Profit − Damaged/Missing Stock Loss − Total Expenses = Net Realized Profit
    const totalGrossProfit = Math.max(0, totalSalesRevenue - totalCostOfSold);
    const netProfitAfterLoss = Math.round((totalGrossProfit - totalDamagedMissingLoss - totalExpenses) * 100) / 100;
    const grossMargin = totalSalesRevenue > 0 ? Math.round((totalGrossProfit / totalSalesRevenue) * 1000) / 10 : 0;
    const netMargin = totalSalesRevenue > 0 ? Math.round((netProfitAfterLoss / totalSalesRevenue) * 1000) / 10 : 0;

    // Finalize branch stats matrix
    const branchWiseList = Object.values(branchStatsMap).map((b) => {
      const gross = Math.max(0, b.salesRevenue - b.costOfSold);
      const net = Math.round(gross - b.damagedMissingLoss - (b.expenses || 0));
      const margin = b.salesRevenue > 0 ? Math.round((gross / b.salesRevenue) * 1000) / 10 : 0;
      return {
        ...b,
        inventoryValue: Math.round(b.inventoryValue),
        salesRevenue: Math.round(b.salesRevenue),
        costOfSold: Math.round(b.costOfSold),
        grossProfit: Math.round(gross),
        damagedMissingLoss: Math.round(b.damagedMissingLoss),
        expenses: Math.round(b.expenses),
        netProfit: net,
        profitMargin: margin,
      };
    });

    // Compute Today's Snapshot for Header Quick Button
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let todaySummary: any = null;

    if (activePeriod === "today") {
      todaySummary = {
        salesRevenue: Math.round(totalSalesRevenue),
        costOfSold: Math.round(totalCostOfSold),
        grossProfit: Math.round(totalGrossProfit),
        damagedMissingLoss: Math.round(totalDamagedMissingLoss),
        expenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfitAfterLoss),
        salesCount: sales.length,
      };
    } else {
      try {
        const todaySales = await (prisma as any).sale.findMany({
          where: {
            tenantId,
            status: "COMPLETED",
            ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            createdAt: { gte: todayStart, lte: todayEnd },
          },
          include: {
            items: true,
          },
        });

        const todayExpensesList = await (prisma as any).branchExpense.findMany({
          where: {
            tenantId,
            ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
            paymentDate: { gte: todayStart, lte: todayEnd },
          },
          select: { amount: true },
        });

        let tRev = 0;
        let tCost = 0;
        (todaySales || []).forEach((s: any) => {
          tRev += Number(s.totalAmount || 0);
          (s.items || []).forEach((item: any) => {
            const baseUnits = Number(item.lowestUnitQuantity || (Number(item.quantity || 0) * Number(item.unitMultiplier || 1)));
            const purchaseP = Number(item.purchasePrice || 0);
            tCost += purchaseP * baseUnits;
          });
        });
        const tGross = Math.max(0, tRev - tCost);
        const tExp = (todayExpensesList || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
        const tNet = Math.round(tGross - tExp);

        todaySummary = {
          salesRevenue: Math.round(tRev),
          costOfSold: Math.round(tCost),
          grossProfit: Math.round(tGross),
          damagedMissingLoss: 0,
          expenses: Math.round(tExp),
          netProfit: tNet,
          salesCount: todaySales.length,
        };
      } catch (err) {
        todaySummary = {
          salesRevenue: 0,
          costOfSold: 0,
          grossProfit: 0,
          damagedMissingLoss: 0,
          expenses: 0,
          netProfit: 0,
          salesCount: 0,
        };
      }
    }

    // Accounts Balances
    let cashBalance = 0;
    let bankBalance = 0;
    let digitalWalletBalance = 0;

    accounts.forEach((acc: any) => {
      const bal = Number(acc.balance || 0);
      if (acc.type === "CASH") cashBalance += bal;
      else if (acc.type === "BANK" || acc.type === "CARD_SETTLEMENT") bankBalance += bal;
      else if (acc.type === "MOBILE") digitalWalletBalance += bal;
    });

    const totalSupplierDues = suppliers.reduce((sum: number, s: any) => sum + Number(s.totalDue || 0), 0);

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const categoryDistribution = Object.values(categoryMap)
      .sort((a, b) => b.revenue - a.revenue);

    return {
      summary: {
        activePeriod,
        dateRange: {
          startDate: rangeStart ? rangeStart.toISOString() : null,
          endDate: rangeEnd ? rangeEnd.toISOString() : null,
        },
        effectiveBranchId: effectiveBranchId || null,
        branchName: activeBranch ? activeBranch.name : "All Branches (Company-Wide)",
        isBranchRestricted,

        // 1. Current Live Inventory & Purchase Cost Valuation
        totalStockUnits,
        totalStockCostValue: Math.round(totalInventoryCostValue),
        totalInventoryValue: Math.round(totalInventoryCostValue),
        totalPurchaseCostValue: Math.round(totalInventoryCostValue),

        // 2. Sales Revenue in Period
        totalSalesRevenue: Math.round(totalSalesRevenue),
        totalRevenue: Math.round(totalSalesRevenue),
        totalSalesCount: sales.length,
        totalTransactions: sales.length,

        // 3. Cost of Sold Products (COGS) in Period
        totalCostOfSold: Math.round(totalCostOfSold),

        // 4. Gross Profit in Period
        totalGrossProfit: Math.round(totalGrossProfit),
        totalProfit: Math.round(totalGrossProfit),
        grossMargin,

        // 5. Damaged & Missing Stock Loss in Period
        totalDamagedMissingLoss: Math.round(totalDamagedMissingLoss),
        damagedMissingUnitsCount,

        // 6. Total Operating Expenses in Period
        totalExpenses: Math.round(totalExpenses),

        // 7. Net Realized Profit After Loss & Expenses
        netProfitAfterLoss: Math.round(netProfitAfterLoss),
        netMargin,

        // Alerts & Stock Counts
        lowStockCount,
        nearExpiryCount,
        expiredCount,

        // Financial Liquidity
        supplierDues: Math.round(totalSupplierDues * 100) / 100,
        cashBalance: Math.round(cashBalance * 100) / 100,
        bankBalance: Math.round(bankBalance * 100) / 100,
        digitalWalletBalance: Math.round(digitalWalletBalance * 100) / 100,
      },
      todaySummary,
      branchWisePerformance: branchWiseList,
      charts: {
        dailySalesTrend: Object.values(dynamicTrendMap),
        paymentBreakdown,
        categoryDistribution,
        stockByCategory,
        topSellingProducts,
      },
      alerts: {
        lowStockItems,
        nearExpiryItems,
      },
    };
  }


  /**
   * Branch Report Summary for a specific date:
   * Attendance, Sales, Expenses, Profit, Stock units & Valuation
   */
  static async getBranchReportSummary(tenantId: string, branchId: string, dateStr: string) {
    const formattedDate = dateStr ? dateStr.split("T")[0] : new Date().toISOString().split("T")[0];
    const dayStart = this.parseBoundaryDate(formattedDate, false);
    const dayEnd = this.parseBoundaryDate(formattedDate, true);

    const [
      branch,
      tenant,
      totalStaffCount,
      presentStaffCount,
      salesAgg,
      expenseAgg,
      inventories,
    ] = await Promise.all([
      (prisma as any).branch.findFirst({
        where: { id: branchId, tenantId },
        select: { id: true, name: true, location: true, phone: true },
      }),
      (prisma as any).tenant.findFirst({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, email: true, logoUrl: true, address: true },
      }),
      (prisma as any).user.count({
        where: { tenantId, branchId, isActive: true },
      }),
      (prisma as any).employeeAttendance.count({
        where: {
          tenantId,
          branchId,
          date: formattedDate,
          status: { in: ["PRESENT", "LATE"] },
        },
      }),
      (prisma as any).sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          tenantId,
          branchId,
          status: "COMPLETED",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      (prisma as any).branchExpense.aggregate({
        _sum: { amount: true },
        where: {
          tenantId,
          branchId,
          paymentDate: { gte: dayStart, lte: dayEnd },
        },
      }),
      (prisma as any).inventory.findMany({
        where: {
          branchId,
          quantity: { gt: 0 },
        },
        select: {
          quantity: true,
          purchasePrice: true,
        },
      }),
    ]);

    const totalSales = Number(Number(salesAgg._sum?.totalAmount || 0).toFixed(2));
    const totalExpense = Number(Number(expenseAgg._sum?.amount || 0).toFixed(2));
    const netProfit = Number((totalSales - totalExpense).toFixed(2));

    let stockUnits = 0;
    let stockValuation = 0;
    for (const inv of inventories) {
      const q = Number(inv.quantity || 0);
      const p = Number(inv.purchasePrice || 0);
      stockUnits += q;
      stockValuation += q * p;
    }

    const attendanceRatio = `${presentStaffCount}/${totalStaffCount}`;
    const attendancePercentage = totalStaffCount > 0 ? Math.round((presentStaffCount / totalStaffCount) * 100) : 0;

    return {
      date: dateStr,
      tenant: {
        name: tenant?.name || "Pharmacy Chain",
        logoUrl: tenant?.logoUrl || null,
        phone: tenant?.phone || null,
        address: tenant?.address || null,
      },
      branch: {
        id: branch?.id || branchId,
        name: branch?.name || "Main Branch",
        location: branch?.location || null,
        phone: branch?.phone || tenant?.phone || null,
      },
      metrics: {
        attendance: {
          present: presentStaffCount,
          total: totalStaffCount,
          ratio: attendanceRatio,
          percentage: attendancePercentage,
        },
        totalSales,
        totalExpense,
        netProfit,
        stockUnits,
        stockValuation: Number(stockValuation.toFixed(2)),
      },
    };
  }
  /**
   * Monthly Sales Summary with Day-by-day aggregates & invoice list
   */
  static async getMonthlySalesSummary(
    tenantId: string,
    branchId?: string,
    monthStr?: string,
    filters: { categoryId?: string; subcategoryId?: string } = {}
  ) {
    const rawMonth = monthStr || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStrPart] = rawMonth.split("-");
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStrPart, 10) - 1;

    const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    const where: any = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    };
    if (branchId) {
      where.branchId = branchId;
    }

    const [sales, branch, tenant] = await Promise.all([
      (prisma as any).sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, username: true } },
          branch: { select: { id: true, name: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  categoryId: true,
                  subcategoryId: true,
                  categoryRef: { select: { id: true, name: true } },
                  subcategoryRef: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      branchId
        ? (prisma as any).branch.findUnique({
            where: { id: branchId },
            select: { id: true, name: true, location: true, phone: true },
          })
        : null,
      (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, logoUrl: true },
      }),
    ]);

    // Build day-by-day map
    const dayMap: Record<string, { date: string; dayName: string; invoicesCount: number; totalSales: number; totalPaid: number; totalDue: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, monthIdx, d);
      const dateKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
      dayMap[dateKey] = {
        date: dateKey,
        dayName,
        invoicesCount: 0,
        totalSales: 0,
        totalPaid: 0,
        totalDue: 0,
      };
    }

    let grandSales = 0;
    let grandPaid = 0;
    let grandDue = 0;

    for (const s of sales) {
      const sTotal = Number(s.totalAmount || 0);
      const sPaid = Number(s.paidAmount || 0);
      const sDue = Number(s.dueAmount || 0);

      grandSales += sTotal;
      grandPaid += sPaid;
      grandDue += sDue;

      const dateKey = new Date(s.createdAt).toISOString().split("T")[0];
      if (dayMap[dateKey]) {
        dayMap[dateKey].invoicesCount += 1;
        dayMap[dateKey].totalSales += sTotal;
        dayMap[dateKey].totalPaid += sPaid;
        dayMap[dateKey].totalDue += sDue;
      }
    }

    const daysSummary = Object.values(dayMap)
      .filter((d) => d.invoicesCount > 0 || d.totalSales > 0)
      .map((d) => ({
        ...d,
        totalSales: Number(d.totalSales.toFixed(2)),
        totalPaid: Number(d.totalPaid.toFixed(2)),
        totalDue: Number(d.totalDue.toFixed(2)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const transactions = sales.map((s: any) => ({
      id: s.id,
      receiptNo: s.receiptNo,
      createdAt: s.createdAt,
      customerName: s.customerName || "Walk-in Customer",
      customerPhone: s.customerPhone || null,
      paymentMethod: s.paymentMethod,
      totalAmount: Number(Number(s.totalAmount || 0).toFixed(2)),
      paidAmount: Number(Number(s.paidAmount || 0).toFixed(2)),
      dueAmount: Number(Number(s.dueAmount || 0).toFixed(2)),
      status: s.status,
      prescriptionRef: s.prescriptionRef || null,
      itemsCount: (s.items || []).length,
      cashier: s.user?.name || s.user?.username || "—",
      items: (s.items || []).map((i: any) => ({
        name: i.product?.name || "Medicine",
        quantity: i.quantity,
        unitType: i.unitType || i.product?.unit || "Piece",
        unitPrice: Number(i.unitPrice || 0),
        subTotal: Number(i.subTotal || 0),
        batchNumber: i.batchNumber,
        categoryId: i.product?.categoryId || i.product?.categoryRef?.id,
        categoryName: i.product?.categoryRef?.name,
        subcategoryId: i.product?.subcategoryId || i.product?.subcategoryRef?.id,
        subcategoryName: i.product?.subcategoryRef?.name,
      })),
    }));

    const monthLabel = startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return {
      month: rawMonth,
      monthLabel,
      branch: branch || { id: branchId, name: "All Branches" },
      tenant: tenant || { name: "Pharmacy Chain" },
      totals: {
        totalInvoices: sales.length,
        totalSales: Number(grandSales.toFixed(2)),
        totalPaid: Number(grandPaid.toFixed(2)),
        totalDue: Number(grandDue.toFixed(2)),
      },
      daysSummary,
      transactions,
    };
  }

  /**
   * Procurement & Purchase Report
   */
  static async getPurchaseReport(
    tenantId: string,
    branchId?: string,
    filters: {
      startDate?: string;
      endDate?: string;
      supplierId?: string;
      paymentStatus?: string;
      search?: string;
      categoryId?: string;
      subcategoryId?: string;
    } = {}
  ) {
    const where: any = {
      tenantId,
    };
    if (branchId) {
      where.branchId = branchId;
    }
    if (filters.supplierId && filters.supplierId !== "ALL") {
      where.supplierId = filters.supplierId;
    }
    if (filters.paymentStatus && filters.paymentStatus !== "ALL") {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters.startDate || filters.endDate) {
      where.purchaseDate = {};
      if (filters.startDate) {
        where.purchaseDate.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.purchaseDate.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      }
    }
    if (filters.search) {
      const s = filters.search.trim();
      where.OR = [
        { invoiceNo: { contains: s, mode: "insensitive" } },
        { notes: { contains: s, mode: "insensitive" } },
        { supplier: { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    const [purchases, branch, tenant] = await Promise.all([
      (prisma as any).purchase.findMany({
        where,
        orderBy: { purchaseDate: "desc" },
        include: {
          supplier: { select: { id: true, name: true, phone: true, email: true } },
          branch: { select: { id: true, name: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  genericName: true,
                  unit: true,
                  categoryId: true,
                  subcategoryId: true,
                  categoryRef: { select: { id: true, name: true } },
                  subcategoryRef: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      branchId
        ? (prisma as any).branch.findUnique({
            where: { id: branchId },
            select: { id: true, name: true, location: true, phone: true },
          })
        : null,
      (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, logoUrl: true },
      }),
    ]);

    let grandTotal = 0;
    let grandPaid = 0;
    let grandDue = 0;

    const list = purchases.map((p: any) => {
      const t = Number(p.totalAmount || 0);
      const pd = Number(p.paidAmount || 0);
      const d = Number(p.dueAmount || 0);

      grandTotal += t;
      grandPaid += pd;
      grandDue += d;

      return {
        id: p.id,
        invoiceNo: p.invoiceNo || "—",
        purchaseDate: p.purchaseDate,
        supplierName: p.supplier?.name || "Unknown Supplier",
        supplierPhone: p.supplier?.phone || null,
        totalAmount: Number(t.toFixed(2)),
        paidAmount: Number(pd.toFixed(2)),
        dueAmount: Number(d.toFixed(2)),
        paymentStatus: p.paymentStatus,
        paymentMethod: p.paymentMethod || "CASH",
        notes: p.notes,
        itemsCount: (p.items || []).length,
        items: (p.items || []).map((i: any) => ({
          id: i.id,
          name: i.product?.name || "Medicine",
          genericName: i.product?.genericName || null,
          batchNumber: i.batchNumber || "—",
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString().split("T")[0] : "—",
          boxQuantity: i.boxQuantity || 0,
          stripsPerBox: i.stripsPerBox || 0,
          quantity: i.quantity || 0,
          unitPurchasePrice: Number(i.unitPurchasePrice || 0),
          totalAmount: Number(i.totalAmount || 0),
        })),
      };
    });

    return {
      branch: branch || { id: branchId, name: "All Branches" },
      tenant: tenant || { name: "Pharmacy Chain" },
      totals: {
        totalBills: purchases.length,
        totalAmount: Number(grandTotal.toFixed(2)),
        totalPaid: Number(grandPaid.toFixed(2)),
        totalDue: Number(grandDue.toFixed(2)),
      },
      purchases: list,
    };
  }
  /**
   * Product / Medicine Stock Valuation & Inventory Report
   */
  static async getProductStockReport(
    tenantId: string,
    branchId?: string,
    filters: {
      categoryId?: string;
      subcategoryId?: string;
      brandId?: string;
      search?: string;
    } = {}
  ) {
    const where: any = {
      tenantId,
      isActive: true,
    };

    if (filters.categoryId && filters.categoryId !== "ALL") {
      where.categoryId = filters.categoryId;
    }
    if (filters.subcategoryId && filters.subcategoryId !== "ALL") {
      where.subcategoryId = filters.subcategoryId;
    }
    if (filters.brandId && filters.brandId !== "ALL") {
      where.brandId = filters.brandId;
    }
    if (filters.search) {
      const s = filters.search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { genericName: { contains: s, mode: "insensitive" } },
        { sku: { contains: s, mode: "insensitive" } },
        { barcode: { contains: s, mode: "insensitive" } },
      ];
    }

    const inventoryWhere: any = { quantity: { gt: 0 } };
    if (branchId) {
      inventoryWhere.branchId = branchId;
    }

    const [products, branch, tenant] = await Promise.all([
      (prisma as any).product.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          categoryRef: { select: { id: true, name: true } },
          subcategoryRef: { select: { id: true, name: true } },
          brandRef: { select: { id: true, name: true } },
          unitRef: { select: { id: true, name: true, symbol: true } },
          inventories: {
            where: inventoryWhere,
            select: {
              quantity: true,
              sellingPrice: true,
              boxSellingPrice: true,
              purchasePrice: true,
              expiryDate: true,
              batchNumber: true,
            },
          },
          branchOverrides: branchId
            ? {
                where: { branchId },
                select: { price: true },
              }
            : false,
        },
      }),
      branchId
        ? (prisma as any).branch.findUnique({
            where: { id: branchId },
            select: { id: true, name: true, location: true, phone: true },
          })
        : null,
      (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, logoUrl: true },
      }),
    ]);

    let grandStockQty = 0;
    let grandStockValuation = 0;

    const list = products.map((p: any) => {
      const invs = p.inventories || [];
      const stockQty = invs.reduce((sum: number, inv: any) => sum + Number(inv.quantity || 0), 0);
      const override = p.branchOverrides && p.branchOverrides[0];
      const latestBatch = invs.length > 0 ? invs[0] : null;
      const batchPrice = latestBatch ? Number(latestBatch.sellingPrice || latestBatch.boxSellingPrice || 0) : 0;
      const sellingPrice = override
        ? Number(override.price)
        : Number(p.basePrice) > 0
        ? Number(p.basePrice)
        : batchPrice;

      const unitCost = latestBatch ? Number(latestBatch.purchasePrice || 0) : 0;
      const valuation = invs.reduce((sum: number, inv: any) => {
        const q = Number(inv.quantity || 0);
        const cost = Number(inv.purchasePrice || unitCost || 0);
        return sum + q * cost;
      }, 0);

      grandStockQty += stockQty;
      grandStockValuation += valuation;

      return {
        id: p.id,
        name: p.name,
        genericName: p.genericName || null,
        sku: p.sku || "—",
        barcode: p.barcode || null,
        imageUrl: p.imageUrl || null,
        brand: p.brandRef?.name || p.brandName || p.manufacturer || "—",
        category: p.categoryRef?.name || p.category || "General",
        subcategory: p.subcategoryRef?.name || p.subcategory || null,
        unit: p.unit || p.unitRef?.symbol || "pcs",
        variant: p.size ? `${p.size} (${p.defaultPackType || "Piece"})` : p.defaultPackType || "Standard",
        stockQty,
        sellingPrice: Number(sellingPrice.toFixed(2)),
        unitCost: Number(unitCost.toFixed(2)),
        totalValuation: Number(valuation.toFixed(2)),
        batchesCount: invs.length,
      };
    });

    return {
      branch: branch || { id: branchId, name: "All Branches" },
      tenant: tenant || { name: "Pharmacy Chain" },
      totals: {
        totalProducts: products.length,
        totalStockQty: grandStockQty,
        totalValuation: Number(grandStockValuation.toFixed(2)),
      },
      products: list,
    };
  }
}
