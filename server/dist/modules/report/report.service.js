"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const prisma_1 = require("../../app/lib/prisma");
class ReportService {
    /**
     * Comprehensive Daily & Filterable Sales Report
     */
    /**
     * Helper to parse date string safely in local calendar bounds
     */
    static parseBoundaryDate(dateStr, isEnd = false) {
        if (!dateStr) {
            const now = new Date();
            if (isEnd)
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        }
        const parts = dateStr.split("-").map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            if (isEnd)
                return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
            return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        }
        const d = new Date(dateStr);
        if (isEnd)
            d.setHours(23, 59, 59, 999);
        else
            d.setHours(0, 0, 0, 0);
        return d;
    }
    /**
     * Comprehensive Daily & Filterable Sales Report
     */
    static async getDailySales(tenantId, query, userRole, userBranchId) {
        const startDate = this.parseBoundaryDate(query.startDate, false);
        const endDate = query.endDate
            ? this.parseBoundaryDate(query.endDate, true)
            : query.startDate
                ? this.parseBoundaryDate(query.startDate, true)
                : this.parseBoundaryDate(undefined, true);
        const where = {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.userId) {
            where.userId = query.userId;
        }
        if (query.paymentMethod) {
            where.paymentMethod = query.paymentMethod;
        }
        const [sales, tenant, targetBranch] = await Promise.all([
            prisma_1.prisma.sale.findMany({
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
            prisma_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, name: true, phone: true, email: true, address: true, logoUrl: true },
            }),
            where.branchId
                ? prisma_1.prisma.branch.findUnique({
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
        const productMap = new Map();
        let totalUnitsSold = 0;
        // Hourly distribution
        const hourlyMap = {};
        for (let i = 0; i < 24; i++)
            hourlyMap[i] = { count: 0, revenue: 0 };
        sales.forEach((s) => {
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
            }
            else if (method === "BKASH") {
                paymentBreakdown.bkash += saleTotal;
            }
            else if (method === "NAGAD") {
                paymentBreakdown.nagad += saleTotal;
            }
            else if (method === "BANK" || method === "CARD") {
                paymentBreakdown.card += saleTotal;
            }
            else if (method === "MOBILE") {
                if (note.includes("nagad")) {
                    paymentBreakdown.nagad += saleTotal;
                }
                else {
                    paymentBreakdown.bkash += saleTotal;
                }
            }
            else {
                paymentBreakdown.other += saleTotal;
            }
            // Hourly metric
            const hour = new Date(s.createdAt).getHours();
            hourlyMap[hour].count += 1;
            hourlyMap[hour].revenue += saleTotal;
            // Aggregate Product Sales
            (s.items || []).forEach((item) => {
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
                const entry = productMap.get(pId);
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
            averageUnitPrice: p.quantitySold > 0 ? Math.round((p.totalAmount / p.quantitySold) * 100) / 100 : 0,
        }))
            .sort((a, b) => b.totalAmount - a.totalAmount);
        const transactionList = sales.map((s) => {
            const note = (s.notes || "").toLowerCase();
            let paymentDetail = s.paymentMethod;
            if (s.paymentMethod === "MOBILE") {
                paymentDetail = note.includes("nagad") ? "Nagad" : "bKash";
            }
            else if (s.paymentMethod === "CASH") {
                paymentDetail = "Cash";
            }
            else if (s.paymentMethod === "CARD") {
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
                items: (s.items || []).map((i) => ({
                    name: i.product?.name || "Product",
                    quantity: i.quantity,
                    unitType: i.unitType,
                    unitPrice: Number(i.unitPrice),
                    subTotal: Number(i.subTotal),
                    batchNumber: i.batchNumber,
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
                averageOrderValue: totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
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
        };
    }
    /**
     * Weekly Sales Report (Last 7 Days)
     */
    static async getWeeklySales(tenantId, query, userRole, userBranchId) {
        const end = query.endDate ? new Date(query.endDate) : new Date();
        const start = query.startDate ? new Date(query.startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        const where = {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: start, lte: end },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        const sales = await prisma_1.prisma.sale.findMany({
            where,
            orderBy: { createdAt: "asc" },
        });
        const dayMap = {};
        sales.forEach((s) => {
            const dayKey = new Date(s.createdAt).toISOString().split("T")[0];
            if (!dayMap[dayKey]) {
                dayMap[dayKey] = { count: 0, revenue: 0 };
            }
            dayMap[dayKey].count += 1;
            dayMap[dayKey].revenue += Number(s.totalAmount);
        });
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
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
    static async getMonthlySales(tenantId, query, userRole, userBranchId) {
        const end = query.endDate ? new Date(query.endDate) : new Date();
        const start = query.startDate ? new Date(query.startDate) : new Date(end.getFullYear(), end.getMonth(), 1);
        const where = {
            tenantId,
            status: "COMPLETED",
            createdAt: { gte: start, lte: end },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        const sales = await prisma_1.prisma.sale.findMany({
            where,
            orderBy: { createdAt: "asc" },
        });
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
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
    static async getBranchWiseSales(tenantId, query) {
        const where = {
            tenantId,
            status: "COMPLETED",
        };
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate)
                where.createdAt.gte = new Date(query.startDate);
            if (query.endDate)
                where.createdAt.lte = new Date(query.endDate);
        }
        const [branches, sales] = await Promise.all([
            prisma_1.prisma.branch.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true, location: true },
            }),
            prisma_1.prisma.sale.findMany({
                where,
                select: { branchId: true, totalAmount: true, status: true },
            }),
        ]);
        const branchStats = branches.map((b) => {
            const branchSales = sales.filter((s) => s.branchId === b.id);
            const totalRev = branchSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            return {
                branchId: b.id,
                branchName: b.name,
                location: b.location,
                transactions: branchSales.length,
                totalRevenue: Math.round(totalRev * 100) / 100,
            };
        });
        return {
            branches: branchStats.sort((a, b) => b.totalRevenue - a.totalRevenue),
        };
    }
    /**
     * Region-Wise Sales Report (Growth+ Tier)
     */
    static async getRegionWiseSales(tenantId, query) {
        const branches = await prisma_1.prisma.branch.findMany({
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
        const regionMap = {};
        branches.forEach((b) => {
            const region = b.location || "Default Region";
            if (!regionMap[region]) {
                regionMap[region] = { branchCount: 0, transactionCount: 0, revenue: 0 };
            }
            regionMap[region].branchCount += 1;
            regionMap[region].transactionCount += b.sales.length;
            regionMap[region].revenue += b.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
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
    static async getCompanyWideSales(tenantId, query) {
        const where = { tenantId };
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate)
                where.createdAt.gte = new Date(query.startDate);
            if (query.endDate)
                where.createdAt.lte = new Date(query.endDate);
        }
        const sales = await prisma_1.prisma.sale.findMany({
            where,
        });
        const completedSales = sales.filter((s) => s.status === "COMPLETED");
        const refundedSales = sales.filter((s) => s.status === "REFUNDED");
        const voidedSales = sales.filter((s) => s.status === "VOIDED");
        const grossRevenue = completedSales.reduce((sum, s) => sum + Number(s.subTotal), 0);
        const totalDiscounts = completedSales.reduce((sum, s) => sum + Number(s.discount), 0);
        const totalTaxes = completedSales.reduce((sum, s) => sum + Number(s.tax), 0);
        const netRevenue = completedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const refundedAmount = refundedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
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
    static async getInventoryReport(tenantId, branchId, userRole, userBranchId) {
        const where = {
            product: { tenantId, isActive: true },
            branch: { tenantId, isActive: true },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole || "") && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (branchId) {
            where.branchId = branchId;
        }
        const inventories = await prisma_1.prisma.inventory.findMany({
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
        inventories.forEach((inv) => {
            totalStockUnits += inv.quantity;
            totalValuation += inv.quantity * Number(inv.product.basePrice);
            if (inv.quantity <= (inv.lowStockThreshold || 5))
                lowStockCount += 1;
            if (inv.expiryDate && new Date(inv.expiryDate) < now)
                expiredCount += 1;
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
    static async getVatMisReport(tenantId, query) {
        const where = {
            tenantId,
            status: "COMPLETED",
        };
        if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate)
                where.createdAt.gte = new Date(query.startDate);
            if (query.endDate)
                where.createdAt.lte = new Date(query.endDate);
        }
        const sales = await prisma_1.prisma.sale.findMany({
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
        sales.forEach((s) => {
            totalVatCollected += Number(s.tax);
            if (Number(s.tax) > 0) {
                taxableSales += Number(s.subTotal);
            }
            if (s.managerApprovedBy)
                controlledSalesCount += 1;
            if (s.prescriptionRef)
                prescriptionSalesCount += 1;
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
    static async getDashboardMetrics(tenantId, branchId, userRole, userBranchId, userId, period, startDate, endDate) {
        const isBranchRestricted = ["BRANCH_MANAGER", "MANAGER", "CASHIER", "INVENTORY_EXECUTIVE"].includes(userRole || "");
        let effectiveBranchId = undefined;
        if (isBranchRestricted) {
            if (userBranchId) {
                effectiveBranchId = userBranchId;
            }
            else if (userId) {
                const dbUser = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { branchId: true },
                });
                if (dbUser?.branchId) {
                    effectiveBranchId = dbUser.branchId;
                }
            }
        }
        else {
            effectiveBranchId = branchId && branchId !== "all" ? branchId : undefined;
        }
        const now = new Date();
        let rangeStart;
        let rangeEnd;
        const activePeriod = period || (startDate || endDate ? "custom" : "30d");
        if (activePeriod === "today") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (activePeriod === "yesterday") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        }
        else if (activePeriod === "7d") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
            rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (activePeriod === "30d") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
            rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (activePeriod === "custom") {
            if (startDate) {
                rangeStart = new Date(startDate);
                rangeStart.setHours(0, 0, 0, 0);
            }
            if (endDate) {
                rangeEnd = new Date(endDate);
                rangeEnd.setHours(23, 59, 59, 999);
            }
        }
        const saleWhere = {
            tenantId,
            status: "COMPLETED",
        };
        if (effectiveBranchId)
            saleWhere.branchId = effectiveBranchId;
        if (rangeStart || rangeEnd) {
            saleWhere.createdAt = {};
            if (rangeStart)
                saleWhere.createdAt.gte = rangeStart;
            if (rangeEnd)
                saleWhere.createdAt.lte = rangeEnd;
        }
        const inventoryWhere = {
            branch: { tenantId },
        };
        if (effectiveBranchId)
            inventoryWhere.branchId = effectiveBranchId;
        // Build transfer loss filter atomically to avoid branch filter being overwritten by date range
        const transferLossWhere = {
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
        }
        else if (rangeStart || rangeEnd) {
            transferLossWhere.transfer = transferDateFilter;
        }
        const ninetyDaysFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const [sales, inventories, accounts, suppliers, allBranches, transferLossItems, directDamageMovements] = await Promise.all([
            prisma_1.prisma.sale.findMany({
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
            prisma_1.prisma.inventory.findMany({
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
            prisma_1.prisma.financialAccount.findMany({
                where: { tenantId, isActive: true, ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}) },
            }),
            prisma_1.prisma.supplier.findMany({
                where: { tenantId, isActive: true },
                select: { totalDue: true },
            }),
            prisma_1.prisma.branch.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true, location: true },
            }),
            prisma_1.prisma.transferItem.findMany({
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
            prisma_1.prisma.stockMovement.findMany({
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
        ]);
        const activeBranch = effectiveBranchId ? allBranches.find((b) => b.id === effectiveBranchId) : null;
        // Financial & Sales Calculations
        let totalSalesRevenue = 0;
        let totalCostOfSold = 0;
        const paymentBreakdown = {
            CASH: 0,
            BKASH: 0,
            NAGAD: 0,
            CARD: 0,
            OTHER: 0,
        };
        const categoryMap = {};
        const productSalesMap = {};
        // Dynamic Trend Map according to activePeriod
        const dynamicTrendMap = {};
        if (activePeriod === "today" || activePeriod === "yesterday") {
            // 24 Hourly buckets
            for (let h = 0; h < 24; h++) {
                const hourStr = String(h).padStart(2, "0");
                const hourLabel = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
                dynamicTrendMap[hourStr] = { key: hourStr, label: hourLabel, sales: 0, revenue: 0, profit: 0 };
            }
        }
        else if (activePeriod === "7d") {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                const dateStr = d.toISOString().split("T")[0];
                const label = d.toLocaleDateString("en-US", { weekday: "short" });
                dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, profit: 0 };
            }
        }
        else if (activePeriod === "30d") {
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                const dateStr = d.toISOString().split("T")[0];
                const label = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
                dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, profit: 0 };
            }
        }
        else if (activePeriod === "custom" && rangeStart && rangeEnd) {
            const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 2) {
                for (let h = 0; h < 24; h++) {
                    const hourStr = String(h).padStart(2, "0");
                    const hourLabel = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
                    dynamicTrendMap[hourStr] = { key: hourStr, label: hourLabel, sales: 0, revenue: 0, profit: 0 };
                }
            }
            else {
                const stepDays = Math.min(diffDays, 60);
                for (let i = stepDays; i >= 0; i--) {
                    const d = new Date(rangeEnd.getTime() - i * 24 * 60 * 60 * 1000);
                    if (d >= rangeStart) {
                        const dateStr = d.toISOString().split("T")[0];
                        const label = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
                        dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, profit: 0 };
                    }
                }
            }
        }
        else {
            // All-time or 6-Month Monthly Trend
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                dynamicTrendMap[key] = { key, label, sales: 0, revenue: 0, profit: 0 };
            }
        }
        // Branch performance tracker
        const branchStatsMap = {};
        allBranches.forEach((b) => {
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
                netProfit: 0,
            };
        });
        sales.forEach((s) => {
            const saleAmount = Number(s.totalAmount || 0);
            totalSalesRevenue += saleAmount;
            if (s.branchId && branchStatsMap[s.branchId]) {
                branchStatsMap[s.branchId].salesRevenue += saleAmount;
                branchStatsMap[s.branchId].ordersCount += 1;
            }
            // Payment method
            const rawMethod = String(s.paymentMethod || "CASH").toUpperCase();
            if (rawMethod === "CASH")
                paymentBreakdown.CASH += saleAmount;
            else if (rawMethod === "BKASH")
                paymentBreakdown.BKASH += saleAmount;
            else if (rawMethod === "NAGAD")
                paymentBreakdown.NAGAD += saleAmount;
            else if (rawMethod === "CARD" || rawMethod === "POS")
                paymentBreakdown.CARD += saleAmount;
            else if (rawMethod === "MOBILE")
                paymentBreakdown.BKASH += saleAmount;
            else
                paymentBreakdown.OTHER += saleAmount;
            // Items calculation for COGS, category, and top products
            let saleCost = 0;
            (s.items || []).forEach((item) => {
                const itemSub = Number(item.subTotal || item.totalPrice || 0);
                const itemQty = Number(item.quantity || 0);
                // Use lowestUnitQuantity (actual base units deducted) for accurate COGS.
                // purchasePrice is stored per base unit (e.g. per tablet); quantity is package count (strips/boxes).
                // Fallback: if lowestUnitQuantity not set, derive from quantity × unitMultiplier.
                const baseUnits = Number(item.lowestUnitQuantity || (itemQty * Number(item.unitMultiplier || 1)));
                const purchaseP = Number(item.purchasePrice ?? (item.product?.basePrice ?? 0));
                saleCost += purchaseP * baseUnits;
                const catName = item.product?.categoryRef?.name ||
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
                    dynamicTrendMap[hourStr].profit += profit;
                }
            }
            else if (activePeriod === "all") {
                const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
                if (dynamicTrendMap[monthKey]) {
                    dynamicTrendMap[monthKey].sales += 1;
                    dynamicTrendMap[monthKey].revenue += saleAmount;
                    dynamicTrendMap[monthKey].profit += profit;
                }
            }
            else {
                const dateKey = saleDate.toISOString().split("T")[0];
                if (dynamicTrendMap[dateKey]) {
                    dynamicTrendMap[dateKey].sales += 1;
                    dynamicTrendMap[dateKey].revenue += saleAmount;
                    dynamicTrendMap[dateKey].profit += profit;
                }
            }
        });
        // Current Inventory Calculations across relevant branches
        let totalStockUnits = 0;
        let totalInventoryCostValue = 0;
        let lowStockCount = 0;
        let nearExpiryCount = 0;
        let expiredCount = 0;
        const lowStockItems = [];
        const nearExpiryItems = [];
        const stockCategoryMap = {};
        inventories.forEach((inv) => {
            const qty = Number(inv.quantity || 0);
            totalStockUnits += qty;
            const unitVal = Number(inv.purchasePrice ?? inv.product?.basePrice ?? 0);
            const lineVal = qty * unitVal;
            totalInventoryCostValue += lineVal;
            // Category Stock Aggregation
            const catName = inv.product?.categoryRef?.name ||
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
                }
                else if (expDate <= ninetyDaysFuture) {
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
        transferLossItems.forEach((item) => {
            const lineLoss = Number(item.damagedValue || 0) + Number(item.missingValue || 0);
            const lineUnits = Number(item.damagedQuantity || 0) + Number(item.missingQuantity || 0);
            totalDamagedMissingLoss += lineLoss;
            damagedMissingUnitsCount += lineUnits;
            const targetBranchId = item.transfer?.toBranchId || item.transfer?.fromBranchId;
            if (targetBranchId && branchStatsMap[targetBranchId]) {
                branchStatsMap[targetBranchId].damagedMissingLoss += lineLoss;
            }
        });
        directDamageMovements.forEach((mov) => {
            const lineLoss = Math.abs(Number(mov.quantity || 0)) * Number(mov.unitPrice || 0);
            totalDamagedMissingLoss += lineLoss;
            damagedMissingUnitsCount += Math.abs(Number(mov.quantity || 0));
            if (mov.branchId && branchStatsMap[mov.branchId]) {
                branchStatsMap[mov.branchId].damagedMissingLoss += lineLoss;
            }
        });
        // Compute Gross Profit & Net Profit:
        // Sales Revenue − Purchase/Cost of Sold Products = Gross Profit
        // Gross Profit − Damaged/Missing Stock Loss = Net Profit
        const totalGrossProfit = Math.max(0, totalSalesRevenue - totalCostOfSold);
        const netProfitAfterLoss = Math.round((totalGrossProfit - totalDamagedMissingLoss) * 100) / 100;
        const grossMargin = totalSalesRevenue > 0 ? Math.round((totalGrossProfit / totalSalesRevenue) * 1000) / 10 : 0;
        const netMargin = totalSalesRevenue > 0 ? Math.round((netProfitAfterLoss / totalSalesRevenue) * 1000) / 10 : 0;
        // Finalize branch stats matrix
        const branchWiseList = Object.values(branchStatsMap).map((b) => {
            const gross = Math.max(0, b.salesRevenue - b.costOfSold);
            const net = Math.round(gross - b.damagedMissingLoss);
            const margin = b.salesRevenue > 0 ? Math.round((gross / b.salesRevenue) * 1000) / 10 : 0;
            return {
                ...b,
                inventoryValue: Math.round(b.inventoryValue),
                salesRevenue: Math.round(b.salesRevenue),
                costOfSold: Math.round(b.costOfSold),
                grossProfit: Math.round(gross),
                damagedMissingLoss: Math.round(b.damagedMissingLoss),
                netProfit: net,
                profitMargin: margin,
            };
        });
        // Accounts Balances
        let cashBalance = 0;
        let bankBalance = 0;
        let digitalWalletBalance = 0;
        accounts.forEach((acc) => {
            const bal = Number(acc.balance || 0);
            if (acc.type === "CASH")
                cashBalance += bal;
            else if (acc.type === "BANK" || acc.type === "CARD_SETTLEMENT")
                bankBalance += bal;
            else if (acc.type === "MOBILE")
                digitalWalletBalance += bal;
        });
        const totalSupplierDues = suppliers.reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
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
                // 6. Net Realized Profit After Loss
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
}
exports.ReportService = ReportService;
