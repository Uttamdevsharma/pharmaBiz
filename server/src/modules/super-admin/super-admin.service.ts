import { prisma } from "../../app/lib/prisma";
import { CreatePlanInput, UpdatePlanInput, ListTenantsQuery } from "./super-admin.validation";
import { PlatformAnalyticsResponse, PharmacyGrowthPoint, SubscriptionByPlanData } from "./super-admin.types";
import { EmailService } from "../../app/lib/email.service";
import { CENTRAL_PLAN_DEFINITIONS, PricingTierType } from "../../app/lib/planLimits";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export class SuperAdminService {
  /**
   * Helper: Calculate Prisma date range filter for date presets and custom date ranges
   */
  static getDateRangeFilter(datePreset?: string, startDate?: string, endDate?: string) {
    if (!datePreset || datePreset === "ALL") return undefined;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (datePreset === "TODAY") {
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { gte: startOfToday, lte: endOfToday };
    }

    if (datePreset === "YESTERDAY") {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(startOfToday);
      endOfYesterday.setMilliseconds(-1);
      return { gte: startOfYesterday, lte: endOfYesterday };
    }

    if (datePreset === "THIS_MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { gte: startOfMonth, lte: endOfMonth };
    }

    if (datePreset === "LAST_MONTH") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { gte: startOfLastMonth, lte: endOfLastMonth };
    }

    if (datePreset === "THIS_YEAR") {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { gte: startOfYear, lte: endOfYear };
    }

    if (datePreset === "CUSTOM") {
      const filter: any = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.lte = e;
      }
      return Object.keys(filter).length > 0 ? filter : undefined;
    }

    return undefined;
  }

  /**
   * Plans Management
   */
  static async createPlan(data: CreatePlanInput) {
    const existing = await (prisma as any).subscriptionPlan.findUnique({
      where: { tier: data.tier },
    });

    if (existing) {
      throw new Error(`A subscription plan already exists for tier ${data.tier}. Please update the existing plan.`);
    }

    const feat = {
      ...(data.features || {}),
      ...(data.maxStaffPerBranch !== undefined && { maxStaffPerBranch: data.maxStaffPerBranch }),
      ...(data.maxTotalStaff !== undefined && { maxTotalStaff: data.maxTotalStaff }),
      ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
      ...(data.yearlyDiscountPercent !== undefined && { yearlyDiscountPercent: data.yearlyDiscountPercent }),
    };

    return await (prisma as any).subscriptionPlan.create({
      data: {
        name: data.name,
        tier: data.tier,
        price: data.price,
        billingCycle: data.billingCycle,
        maxBranches: data.maxBranches,
        features: feat,
        isActive: data.isActive,
      },
    });
  }

  static async listPlans() {
    const plans = await (prisma as any).subscriptionPlan.findMany({
      orderBy: { price: "asc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return plans.map((p: any) => {
      const feat = (typeof p.features === "object" && p.features !== null) ? p.features : {};
      const fallback: any = (CENTRAL_PLAN_DEFINITIONS as any)[p.tier] || CENTRAL_PLAN_DEFINITIONS.STARTER;
      return {
        ...p,
        maxStaffPerBranch: feat.maxStaffPerBranch ?? fallback.maxStaffPerBranch ?? 1,
        maxTotalStaff: feat.maxTotalStaff ?? fallback.maxTotalStaff ?? (p.maxBranches * (feat.maxStaffPerBranch ?? 1)),
        trialDays: feat.trialDays ?? (p.tier === "TRIAL" ? 7 : 0),
        yearlyDiscountPercent: feat.yearlyDiscountPercent ?? 0,
      };
    });
  }

  static async getPlanById(id: string) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            tenant: {
              select: { id: true, name: true, tier: true, isActive: true },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {};
    const fallback: any = (CENTRAL_PLAN_DEFINITIONS as any)[plan.tier] || CENTRAL_PLAN_DEFINITIONS.STARTER;
    return {
      ...plan,
      maxStaffPerBranch: feat.maxStaffPerBranch ?? fallback.maxStaffPerBranch ?? 1,
      maxTotalStaff: feat.maxTotalStaff ?? fallback.maxTotalStaff ?? (plan.maxBranches * (feat.maxStaffPerBranch ?? 1)),
      trialDays: feat.trialDays ?? (plan.tier === "TRIAL" ? 7 : 0),
      yearlyDiscountPercent: feat.yearlyDiscountPercent ?? 0,
    };
  }

  static async updatePlan(id: string, data: UpdatePlanInput) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    const currentFeatures = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {};
    const updatedFeatures = {
      ...currentFeatures,
      ...(data.features || {}),
      ...(data.maxStaffPerBranch !== undefined && { maxStaffPerBranch: data.maxStaffPerBranch }),
      ...(data.maxTotalStaff !== undefined && { maxTotalStaff: data.maxTotalStaff }),
      ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
      ...(data.yearlyDiscountPercent !== undefined && { yearlyDiscountPercent: data.yearlyDiscountPercent }),
    };

    return await (prisma as any).subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.billingCycle && { billingCycle: data.billingCycle }),
        ...(data.maxBranches !== undefined && { maxBranches: data.maxBranches }),
        features: updatedFeatures,
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async deletePlan(id: string) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    if (plan._count.subscriptions > 0) {
      // Soft-deactivate if active subscriptions exist
      return await (prisma as any).subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return await (prisma as any).subscriptionPlan.delete({ where: { id } });
  }

  /**
   * Tenant Administration
   */
  static async listTenants(query: ListTenantsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { name: { not: "Platform HQ" } };

    if (query.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.subscriptionStatus) {
      where.subscriptions = {
        some: {
          status: query.subscriptionStatus,
        },
      };
    }

    const dateRange = SuperAdminService.getDateRangeFilter(query.datePreset, query.startDate, query.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const [total, tenants] = await Promise.all([
      (prisma as any).tenant.count({ where }),
      (prisma as any).tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { branches: true, users: true },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            include: { plan: true },
            take: 1,
          },
        },
      }),
    ]);

    // Format output without any tenant sales/POS data
    const formattedTenants = tenants.map((t: any) => ({
      id: t.id,
      name: t.name,
      tier: t.tier,
      isActive: t.isActive,
      email: t.email,
      phone: t.phone,
      address: t.address,
      createdAt: t.createdAt,
      branchCount: t._count.branches,
      userCount: t._count.users,
      activeSubscription: t.subscriptions[0] || null,
      subscriptions: t.subscriptions || [],
    }));

    return {
      data: formattedTenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTenantDetails(id: string) {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: true,
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    return tenant;
  }

  static async getTenantSubscription(tenantId: string) {
    const subscriptions = await (prisma as any).subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true, payments: true },
    });

    return subscriptions;
  }

  static async updateTenantStatus(id: string, isActive: boolean) {
    const tenant = await (prisma as any).tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.name === "Platform HQ") {
      throw new Error("Platform HQ system tenant status cannot be modified or suspended.");
    }

    return await (prisma as any).tenant.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        tier: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Platform Subscriptions List
   */
  static async listSubscriptions(
    page = 1,
    limit = 50,
    status?: string,
    query?: { datePreset?: string; startDate?: string; endDate?: string; tier?: string; search?: string }
  ) {
    const skip = (page - 1) * limit;
    const where: any = { tenant: { name: { not: "Platform HQ" } } };

    if (status && status !== "ALL") {
      where.status = status;
    }

    const dateRange = SuperAdminService.getDateRangeFilter(query?.datePreset, query?.startDate, query?.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    if (query?.tier) {
      where.tenant = { ...where.tenant, tier: query.tier };
    }

    if (query?.search) {
      const searchStr = query.search.trim();
      where.AND = [
        {
          OR: [
            { tenant: { name: { contains: searchStr, mode: "insensitive" } } },
            { tenant: { email: { contains: searchStr, mode: "insensitive" } } },
            { plan: { name: { contains: searchStr, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const [total, subscriptions] = await Promise.all([
      (prisma as any).subscription.count({ where }),
      (prisma as any).subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, tier: true, email: true, phone: true, isActive: true },
          },
          plan: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Platform Payments & Transactions
   */
  static async listPlatformPayments(
    page = 1,
    limit = 50,
    datePreset?: string,
    startDate?: string,
    endDate?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = { tenant: { name: { not: "Platform HQ" } } };

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { tranId: { contains: s, mode: "insensitive" } },
        { paymentMethod: { contains: s, mode: "insensitive" } },
        { tenant: { name: { contains: s, mode: "insensitive" } } },
      ];
    }

    const dateRange = SuperAdminService.getDateRangeFilter(datePreset, startDate, endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const [total, payments] = await Promise.all([
      (prisma as any).payment.count({ where }),
      (prisma as any).payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, tier: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Helper: Generate time-series buckets for Pharmacy Growth line graph
   */
  static generatePharmacyGrowthSeries(
    datePreset?: string,
    startDateStr?: string,
    endDateStr?: string,
    approvedTenants: Array<{ approvedAt: Date | string }> = []
  ): PharmacyGrowthPoint[] {
    const now = new Date();
    const preset = datePreset || "ALL";

    interface Bucket {
      label: string;
      date: string;
      start: Date;
      end: Date;
    }
    const buckets: Bucket[] = [];

    if (preset === "TODAY" || preset === "YESTERDAY") {
      const targetDate = preset === "TODAY"
        ? new Date(now)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();

      // 4-hour intervals across the 24 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00, 24:00)
      const hours = [0, 4, 8, 12, 16, 20, 24];
      for (let i = 0; i < hours.length - 1; i++) {
        const hStart = hours[i];
        const hEnd = hours[i + 1];
        const start = new Date(y, m, d, hStart, 0, 0, 0);
        const end = new Date(y, m, d, hEnd - 1, 59, 59, 999);
        const pad = (n: number) => n.toString().padStart(2, "0");
        buckets.push({
          label: `${pad(hStart)}:00`,
          date: start.toISOString(),
          start,
          end,
        });
      }
    } else if (preset === "THIS_MONTH" || preset === "LAST_MONTH") {
      const mOffset = preset === "THIS_MONTH" ? 0 : -1;
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + mOffset, 1);
      const y = targetMonthDate.getFullYear();
      const m = targetMonthDate.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const monthShort = targetMonthDate.toLocaleString("en-US", { month: "short" });

      for (let day = 1; day <= daysInMonth; day++) {
        const start = new Date(y, m, day, 0, 0, 0, 0);
        const end = new Date(y, m, day, 23, 59, 59, 999);
        buckets.push({
          label: `${monthShort} ${day}`,
          date: start.toISOString(),
          start,
          end,
        });
      }
    } else if (preset === "THIS_YEAR") {
      const y = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let m = 0; m < 12; m++) {
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        buckets.push({
          label: monthNames[m],
          date: start.toISOString(),
          start,
          end,
        });
      }
    } else if (preset === "CUSTOM" && (startDateStr || endDateStr)) {
      const s = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
      s.setHours(0, 0, 0, 0);
      const e = endDateStr ? new Date(endDateStr) : new Date(now);
      e.setHours(23, 59, 59, 999);
      const diffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 2) {
        const totalHours = diffDays * 24;
        const step = Math.max(3, Math.floor(totalHours / 6));
        for (let h = 0; h < totalHours; h += step) {
          const start = new Date(s.getTime() + h * 3600 * 1000);
          const end = new Date(Math.min(e.getTime(), start.getTime() + step * 3600 * 1000 - 1));
          const monthShort = start.toLocaleString("en-US", { month: "short" });
          buckets.push({
            label: `${monthShort} ${start.getDate()} ${start.getHours()}:00`,
            date: start.toISOString(),
            start,
            end,
          });
        }
      } else if (diffDays <= 35) {
        for (let d = 0; d < diffDays; d++) {
          const start = new Date(s.getFullYear(), s.getMonth(), s.getDate() + d, 0, 0, 0, 0);
          const end = new Date(s.getFullYear(), s.getMonth(), s.getDate() + d, 23, 59, 59, 999);
          const monthShort = start.toLocaleString("en-US", { month: "short" });
          buckets.push({
            label: `${monthShort} ${start.getDate()}`,
            date: start.toISOString(),
            start,
            end,
          });
        }
      } else {
        let cur = new Date(s.getFullYear(), s.getMonth(), 1);
        while (cur <= e) {
          const start = new Date(cur);
          const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
          const label = cur.toLocaleString("en-US", { month: "short", year: "2-digit" });
          buckets.push({
            label,
            date: start.toISOString(),
            start,
            end,
          });
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
      }
    } else {
      // ALL preset: last 12 months trailing
      const y = now.getFullYear();
      const m = now.getMonth();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(y, m - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
        buckets.push({
          label,
          date: start.toISOString(),
          start,
          end,
        });
      }
    }

    const validApprovedTimestamps = approvedTenants
      .map((t) => new Date(t.approvedAt).getTime())
      .filter((ts) => !isNaN(ts))
      .sort((a, b) => a - b);

    let cumulative = 0;
    const firstBucketStart = buckets[0]?.start.getTime() || 0;
    const priorCount = validApprovedTimestamps.filter((ts) => ts < firstBucketStart).length;
    cumulative = priorCount;

    return buckets.map((b) => {
      const bStart = b.start.getTime();
      const bEnd = b.end.getTime();
      const count = validApprovedTimestamps.filter((ts) => ts >= bStart && ts <= bEnd).length;
      cumulative += count;
      return {
        label: b.label,
        date: b.date,
        count,
        cumulative,
      };
    });
  }

  /**
   * Platform Analytics (Filtered by pharmacy approval date, subscription start date, and payment date)
   */
  static async getPlatformAnalytics(query?: { datePreset?: string; startDate?: string; endDate?: string }): Promise<PlatformAnalyticsResponse> {
    const dateRange = SuperAdminService.getDateRangeFilter(query?.datePreset, query?.startDate, query?.endDate);

    // 1. New Pharmacies: Approved by Admin within date range (or all approved if ALL)
    const approvedFilter: any = {
      name: { not: "Platform HQ" },
      ...(dateRange
        ? { approvedAt: dateRange }
        : {
            OR: [
              { approvedAt: { not: null } },
              { verificationStatus: { in: ["APPROVED_PENDING_PAYMENT", "ACTIVE"] } },
            ],
          }),
    };

    // 2. New Subscriptions: Subscriptions started within date range
    const subFilter: any = {
      tenant: { name: { not: "Platform HQ" } },
      ...(dateRange ? { startDate: dateRange } : {}),
    };

    // 3. Subscription Revenue: Payments validated within date range
    const paymentFilter: any = {
      status: "VALIDATED",
      tenant: { name: { not: "Platform HQ" } },
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    // General tenant filter for active/suspended counts
    const tenantFilter: any = {
      name: { not: "Platform HQ" },
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const [
      newPharmacies,
      newSubscriptions,
      paymentsInRange,
      pendingReview,
      allApprovedTenants,
      subscriptionsInRange,
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSubscriptions,
      activeSubscriptions,
      activeSubsWithPlans,
      recentTenants,
    ] = await Promise.all([
      (prisma as any).tenant.count({ where: approvedFilter }),
      (prisma as any).subscription.count({ where: subFilter }),
      (prisma as any).payment.findMany({
        where: paymentFilter,
        select: { amount: true, createdAt: true },
      }),
      // 4. Pending Review: Current live status, independent of date filter
      (prisma as any).tenant.count({
        where: { name: { not: "Platform HQ" }, verificationStatus: "PENDING_APPROVAL" },
      }),
      // For Pharmacy Growth Line Graph
      (prisma as any).tenant.findMany({
        where: {
          name: { not: "Platform HQ" },
          OR: [
            { approvedAt: { not: null } },
            { verificationStatus: { in: ["APPROVED_PENDING_PAYMENT", "ACTIVE"] } },
          ],
        },
        select: { approvedAt: true, createdAt: true },
      }),
      // For Subscription by Plan Donut Chart
      (prisma as any).subscription.findMany({
        where: subFilter,
        include: {
          plan: { select: { tier: true, name: true } },
          tenant: { select: { tier: true } },
        },
      }),
      (prisma as any).tenant.count({ where: tenantFilter }),
      (prisma as any).tenant.count({ where: { ...tenantFilter, isActive: true } }),
      (prisma as any).tenant.count({ where: { ...tenantFilter, isActive: false } }),
      (prisma as any).subscription.count({ where: subFilter }),
      (prisma as any).subscription.count({ where: { ...subFilter, status: "ACTIVE" } }),
      (prisma as any).subscription.findMany({
        where: { ...subFilter, status: "ACTIVE" },
        include: { plan: true, tenant: { select: { tier: true } } },
      }),
      (prisma as any).tenant.findMany({
        where: tenantFilter,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { branches: true, users: true } } },
      }),
    ]);

    // Calculate subscription revenue in range
    const subscriptionRevenue = paymentsInRange.reduce(
      (sum: number, p: any) => sum + Number(p.amount || 0),
      0
    );

    // Generate Pharmacy Growth time series
    const mappedApproved = allApprovedTenants.map((t: any) => ({
      approvedAt: t.approvedAt || t.createdAt,
    }));
    const pharmacyGrowth = SuperAdminService.generatePharmacyGrowthSeries(
      query?.datePreset,
      query?.startDate,
      query?.endDate,
      mappedApproved
    );

    // Calculate Subscription by Plan distribution
    let starterCount = 0;
    let growthCount = 0;
    let enterpriseCount = 0;

    for (const sub of subscriptionsInRange) {
      const tier = sub.plan?.tier || sub.tenant?.tier;
      if (tier === "STARTER") starterCount++;
      else if (tier === "GROWTH") growthCount++;
      else if (tier === "ENTERPRISE") enterpriseCount++;
    }

    const subTotal = starterCount + growthCount + enterpriseCount;
    const subscriptionByPlan: SubscriptionByPlanData = {
      starter: starterCount,
      growth: growthCount,
      enterprise: enterpriseCount,
      total: subTotal,
      breakdown: [
        {
          tier: "STARTER",
          name: "Starter",
          count: starterCount,
          percentage: subTotal > 0 ? Math.round((starterCount / subTotal) * 100) : 0,
          color: "#3B82F6",
        },
        {
          tier: "GROWTH",
          name: "Growth",
          count: growthCount,
          percentage: subTotal > 0 ? Math.round((growthCount / subTotal) * 100) : 0,
          color: "#10B981",
        },
        {
          tier: "ENTERPRISE",
          name: "Enterprise",
          count: enterpriseCount,
          percentage: subTotal > 0 ? Math.round((enterpriseCount / subTotal) * 100) : 0,
          color: "#8B5CF6",
        },
      ],
    };

    // Calculate MRR from active subscriptions of client tenants (preserved)
    const monthlyRecurringRevenue = activeSubsWithPlans.reduce((sum: number, s: any) => {
      const price = Number(s.plan?.price || 0);
      const isYearly =
        s.plan?.billingCycle === "YEARLY" ||
        new Date(s.endDate).getTime() - new Date(s.startDate).getTime() > 45 * 24 * 60 * 60 * 1000;
      return isYearly ? sum + price / 12 : sum + price;
    }, 0);

    return {
      // 4 Target Stat Cards
      newPharmacies,
      newSubscriptions,
      subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
      pendingReview,

      // 2 Target Charts
      pharmacyGrowth,
      subscriptionByPlan,

      // Preserved for legacy & analytics tab compatibility
      totalTenants,
      activeTenants,
      suspendedTenants,
      tierBreakdown: {
        starter: starterCount,
        growth: growthCount,
        enterprise: enterpriseCount,
      },
      totalSubscriptions,
      activeSubscriptions,
      totalPlatformRevenue: Math.round(subscriptionRevenue * 100) / 100,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      recentTenants: recentTenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        tier: t.tier,
        isActive: t.isActive,
        createdAt: t.createdAt,
        branchCount: t._count?.branches || 0,
        userCount: t._count?.users || 0,
      })),
    };
  }

  /**
   * ==================== PLATFORM DYNAMIC ROLES & PERMISSIONS ====================
   */
  static async listRoles() {
    const roles = await (prisma as any).platformRole.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      isSystem: r.isSystem,
      isActive: r.isActive !== false,
      userCount: r._count?.users || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  static async createRole(data: { name: string; description?: string; permissions?: string[]; isActive?: boolean }) {
    const nameTrimmed = data.name.trim();
    if (!nameTrimmed) {
      throw new Error("Role name is required");
    }

    if (nameTrimmed.toUpperCase() === "SUPER_ADMIN" || nameTrimmed.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Cannot create a role with Super Admin name. Super Admin is root protected.");
    }

    const existing = await (prisma as any).platformRole.findFirst({
      where: { name: { equals: nameTrimmed, mode: "insensitive" } },
    });

    if (existing) {
      throw new Error(`Role "${nameTrimmed}" already exists`);
    }

    const id = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return await (prisma as any).platformRole.create({
      data: {
        id,
        name: nameTrimmed,
        description: data.description || null,
        permissions: data.permissions || [],
        isSystem: false,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  static async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[]; isActive?: boolean }) {
    const role = await (prisma as any).platformRole.findUnique({ where: { id } });
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isSystem || role.name.toUpperCase() === "SUPER_ADMIN" || role.name.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Super Admin role is permanent and cannot be modified.");
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      const nameTrimmed = data.name.trim();
      if (nameTrimmed.toUpperCase() === "SUPER_ADMIN" || nameTrimmed.toUpperCase() === "SUPER ADMIN") {
        throw new Error("Cannot rename role to Super Admin.");
      }
      updateData.name = nameTrimmed;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return await (prisma as any).platformRole.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteRole(id: string) {
    const role = await (prisma as any).platformRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isSystem || role.name.toUpperCase() === "SUPER_ADMIN" || role.name.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Super Admin role is permanent and cannot be deleted.");
    }

    if (role._count?.users > 0) {
      throw new Error(`Cannot delete role "${role.name}" because ${role._count.users} staff member(s) are currently assigned to it. Please reassign their roles first.`);
    }

    await (prisma as any).platformRole.delete({ where: { id } });
    return { success: true, message: `Role "${role.name}" removed successfully` };
  }

  static async batchUpdateRolePermissions(matrix: { roleId: string; permissions: string[] }[]) {
    const updatedRoles = [];
    for (const item of matrix) {
      const role = await (prisma as any).platformRole.findUnique({
        where: { id: item.roleId },
      });
      if (role && !role.isSystem && role.name.toUpperCase() !== "SUPER_ADMIN") {
        const updated = await (prisma as any).platformRole.update({
          where: { id: item.roleId },
          data: { permissions: item.permissions },
        });
        updatedRoles.push(updated);
      }
    }
    return updatedRoles;
  }

  /**
   * ==================== PLATFORM STAFF MANAGEMENT ====================
   */
  static async listPlatformStaff() {
    // Return all platform staff (Super Admin + any staff under Platform HQ tenant or with custom roles)
    let systemTenant = await (prisma as any).tenant.findFirst({
      where: { name: "Platform HQ" },
    });

    const whereClause: any = systemTenant
      ? {
          OR: [
            { tenantId: systemTenant.id },
            { role: "SUPER_ADMIN" },
            { customRoleId: { not: null } },
            { role: { in: ["CTO", "PROJECT_MANAGER"] } },
          ],
        }
      : {
          OR: [
            { role: "SUPER_ADMIN" },
            { customRoleId: { not: null } },
            { role: { in: ["CTO", "PROJECT_MANAGER"] } },
          ],
        };

    const users = await (prisma as any).user.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      include: {
        customRole: true,
      },
    });

    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      phone: u.phone,
      role: u.role,
      customRoleId: u.customRoleId,
      customRoleName: u.customRole?.name || u.customRoleName || (u.role === "SUPER_ADMIN" ? "Super Admin" : u.role),
      customRole: u.customRole,
      permissions: u.role === "SUPER_ADMIN" ? ["*"] : (u.permissions?.length ? u.permissions : u.customRole?.permissions || []),
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  static async createPlatformStaff(creatorId: string, creatorRole: string, data: any) {
    if (creatorRole !== "SUPER_ADMIN") {
      throw new Error("Only Super Admin can create new platform staff members.");
    }

    if (data.role === "SUPER_ADMIN" || data.role?.toUpperCase() === "SUPER_ADMIN") {
      throw new Error("Cannot create additional Super Admin root accounts. Please assign a custom role.");
    }

    // Find or create Platform HQ System Tenant
    let systemTenant = await (prisma as any).tenant.findFirst({
      where: { name: "Platform HQ" },
    });

    if (!systemTenant) {
      systemTenant = await (prisma as any).tenant.create({
        data: {
          name: "Platform HQ",
          tier: "ENTERPRISE",
          email: "admin@platform.system",
          phone: "01700000000",
          address: "Platform Control Center",
          isActive: true,
        },
      });
    }

    const identifier = (data.username || data.email || "").trim();
    if (!identifier) {
      throw new Error("Email or username is required");
    }

    const existingUser = await (prisma as any).user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username || data.email },
        ],
      },
    });

    if (existingUser) {
      throw new Error("A user with this email or username already exists");
    }

    // Resolve Custom Role if provided by id or name
    let matchedRole: any = null;
    if (data.role) {
      matchedRole = await (prisma as any).platformRole.findFirst({
        where: {
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } },
          ],
        },
      });
    }

    // If role doesn't exist yet in PlatformRole table, create it dynamically
    if (!matchedRole && data.role) {
      const roleName = data.role.trim();
      const roleId = roleName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      matchedRole = await (prisma as any).platformRole.create({
        data: {
          id: roleId,
          name: roleName,
          description: `Custom ${roleName} platform role`,
          permissions: data.permissions || [],
          isSystem: false,
        },
      });
    }

    // Resolve permissions: either custom passed in, or role's permissions
    const assignedPermissions: string[] = Array.isArray(data.permissions) && data.permissions.length > 0
      ? data.permissions
      : matchedRole?.permissions || [];

    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Map Prisma enum role
    const enumRole = matchedRole?.name === "CTO" ? "CTO" : matchedRole?.name === "Project Manager" ? "PROJECT_MANAGER" : "PROJECT_MANAGER";

    const staff = await (prisma as any).user.create({
      data: {
        tenantId: systemTenant.id,
        name: data.name,
        email: data.email,
        username: data.username || data.email,
        phone: data.phone || null,
        passwordHash,
        role: enumRole,
        customRoleId: matchedRole?.id || null,
        customRoleName: matchedRole?.name || data.role,
        permissions: assignedPermissions,
        isActive: true,
      },
      include: {
        customRole: true,
      },
    });

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      username: staff.username,
      phone: staff.phone,
      role: staff.role,
      customRoleId: staff.customRoleId,
      customRoleName: staff.customRole?.name || staff.customRoleName,
      permissions: staff.permissions,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
    };
  }

  static async updatePlatformStaff(id: string, updaterId: string, updaterRole: string, data: any) {
    const targetUser = await (prisma as any).user.findUnique({
      where: { id },
      include: { customRole: true },
    });

    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }

    // Security Invariant: Super Admin master account cannot be modified, downgraded, or re-assigned by delegated staff
    if (targetUser.role === "SUPER_ADMIN") {
      if (updaterRole !== "SUPER_ADMIN") {
        throw new Error("Delegated staff cannot modify or alter the Super Admin master account.");
      }
      if (data.role && data.role !== "SUPER_ADMIN") {
        throw new Error("Cannot change Super Admin role.");
      }
      if (data.isActive === false) {
        throw new Error("Super Admin master account cannot be deactivated.");
      }
    }

    // Delegates cannot elevate any account to Super Admin
    if (updaterRole !== "SUPER_ADMIN" && (data.role === "SUPER_ADMIN" || data.customRoleName === "SUPER_ADMIN")) {
      throw new Error("Delegated platform staff cannot promote accounts to Super Admin.");
    }

    let customRoleId = targetUser.customRoleId;
    let customRoleName = targetUser.customRoleName;

    if (data.role && targetUser.role !== "SUPER_ADMIN") {
      let matchedRole = await (prisma as any).platformRole.findFirst({
        where: {
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } },
          ],
        },
      });

      if (matchedRole) {
        customRoleId = matchedRole.id;
        customRoleName = matchedRole.name;
      } else {
        customRoleName = data.role;
      }
    }

    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.permissions !== undefined && { permissions: data.permissions }),
      ...(customRoleId !== undefined && { customRoleId }),
      ...(customRoleName !== undefined && { customRoleName }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    if (data.password) {
      const bcrypt = require("bcryptjs");
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await (prisma as any).user.update({
      where: { id },
      data: updateData,
      include: {
        customRole: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      phone: updated.phone,
      role: updated.role,
      customRoleId: updated.customRoleId,
      customRoleName: updated.customRole?.name || updated.customRoleName,
      permissions: updated.role === "SUPER_ADMIN" ? ["*"] : updated.permissions,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  static async updatePlatformStaffStatus(id: string, updaterId: string, updaterRole: string, isActive: boolean) {
    const targetUser = await (prisma as any).user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }

    if (targetUser.role === "SUPER_ADMIN") {
      throw new Error("Super Admin master account cannot be deactivated or disabled.");
    }

    if (targetUser.id === updaterId && !isActive) {
      throw new Error("You cannot deactivate your own staff account.");
    }

    return await (prisma as any).user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
  }

  static async deletePlatformStaff(id: string, updaterId: string, updaterRole: string) {
    const targetUser = await (prisma as any).user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }

    if (targetUser.role === "SUPER_ADMIN") {
      throw new Error("Super Admin master account cannot be deleted or removed under any circumstance.");
    }

    if (targetUser.id === updaterId) {
      throw new Error("You cannot delete your own staff account.");
    }

    await (prisma as any).user.delete({ where: { id } });
    return { success: true, message: `Platform staff account ${targetUser.username} removed.` };
  }

  static async getPlatformPermissionsHierarchy() {
    const roles = await this.listRoles();

    const availablePermissions = [
      {
        id: "pharmacies.manage",
        name: "Manage Pharmacies",
        category: "Pharmacies & Tenants",
        description: "View, inspect, activate, and suspend pharmacy tenant accounts.",
      },
      {
        id: "subscriptions.manage",
        name: "Manage Subscriptions",
        category: "Subscriptions & Billing",
        description: "Manage tenant subscription lifecycle, renewals, and statuses.",
      },
      {
        id: "plans.manage",
        name: "Manage Plans",
        category: "Subscriptions & Billing",
        description: "Create, configure, update, and manage pricing tiers and feature limits.",
      },
      {
        id: "payments.view",
        name: "View Payments",
        category: "Subscriptions & Billing",
        description: "Inspect revenue transactions, payment statuses, and invoice records.",
      },
      {
        id: "reports.view",
        name: "View Reports",
        category: "Analytics & Telemetry",
        description: "Access platform MRR, revenue growth analytics, and tenant reports.",
      },
      {
        id: "staff.create",
        name: "Create Staff",
        category: "Staff & Access Control",
        description: "Create new platform staff members and assign roles and permissions.",
      },
      {
        id: "staff.manage",
        name: "Manage Staff",
        category: "Staff & Access Control",
        description: "Edit staff profiles, update permission matrix, toggle status, and delete staff.",
      },
      {
        id: "roles.manage",
        name: "Manage Roles & Permissions",
        category: "Staff & Access Control",
        description: "Create dynamic custom roles, edit permissions, and manage role assignments.",
      },
      {
        id: "settings.manage",
        name: "Manage System Settings",
        category: "Platform Administration",
        description: "Configure platform branding, landing page content, and global settings.",
      },
      {
        id: "platform.data",
        name: "Manage Platform Data",
        category: "Platform Administration",
        description: "Access system telemetry, audit logs, and platform diagnostic data.",
      },
    ];

    return {
      roles,
      availablePermissions,
    };
  }

  static async updatePlatformRolePermissions(roleIdentifier: string, permissions: string[]) {
    // Find role by id or name
    let role = await (prisma as any).platformRole.findFirst({
      where: {
        OR: [
          { id: roleIdentifier },
          { name: { equals: roleIdentifier, mode: "insensitive" } },
        ],
      },
    });

    if (!role) {
      throw new Error(`Role "${roleIdentifier}" not found.`);
    }

    const updated = await (prisma as any).platformRole.update({
      where: { id: role.id },
      data: { permissions },
    });

    return { success: true, role: updated.name, permissions: updated.permissions };
  }

  /**
   * List Pharmacy Verification Applications with filtering & metrics
   */
  static async listPharmacyVerifications(query?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    datePreset?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      name: { not: "Platform HQ" },
    };

    if (query?.status && query.status !== "ALL") {
      where.verificationStatus = query.status;
    }

    const dateRange = SuperAdminService.getDateRangeFilter(query?.datePreset, query?.startDate, query?.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    if (query?.search) {
      const search = query.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { nidNumber: { contains: search, mode: "insensitive" } },
            { tradeLicenseNumber: { contains: search, mode: "insensitive" } },
            { drugLicenseNumber: { contains: search, mode: "insensitive" } },
            { users: { some: { name: { contains: search, mode: "insensitive" }, role: "COMPANY_OWNER" } } },
          ],
        },
      ];
    }

    const baseMetricWhere: any = {
      name: { not: "Platform HQ" },
    };
    if (dateRange) {
      baseMetricWhere.createdAt = dateRange;
    }

    const [tenants, total, pendingCount, approvedCount, rejectedCount, activeCount, totalMetricsCount] = await Promise.all([
      (prisma as any).tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          users: {
            where: { role: "COMPANY_OWNER" },
            select: { id: true, name: true, email: true, phone: true, username: true, createdAt: true },
            take: 1,
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true },
          },
        },
      }),
      (prisma as any).tenant.count({ where }),
      (prisma as any).tenant.count({ where: { ...baseMetricWhere, verificationStatus: "PENDING_APPROVAL" } }),
      (prisma as any).tenant.count({ where: { ...baseMetricWhere, verificationStatus: "APPROVED_PENDING_PAYMENT" } }),
      (prisma as any).tenant.count({ where: { ...baseMetricWhere, verificationStatus: "REJECTED" } }),
      (prisma as any).tenant.count({ where: { ...baseMetricWhere, verificationStatus: "ACTIVE" } }),
      (prisma as any).tenant.count({ where: baseMetricWhere }),
    ]);

    const formatted = tenants.map((t: any) => {
      const owner = t.users?.[0] || null;
      const latestSub = t.subscriptions?.[0] || null;
      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        address: t.address,
        tier: t.tier,
        isActive: t.isActive,
        verificationStatus: t.verificationStatus,
        nidNumber: t.nidNumber,
        nidDocUrl: t.nidDocUrl,
        nidFrontUrl: t.nidFrontUrl || t.nidDocUrl,
        nidBackUrl: t.nidBackUrl,
        tradeLicenseNumber: t.tradeLicenseNumber,
        tradeLicenseDocUrl: t.tradeLicenseDocUrl,
        tradeLicenseFrontUrl: t.tradeLicenseFrontUrl || t.tradeLicenseDocUrl,
        tradeLicenseBackUrl: t.tradeLicenseBackUrl,
        drugLicenseNumber: t.drugLicenseNumber,
        drugLicenseDocUrl: t.drugLicenseDocUrl,
        drugLicenseFrontUrl: t.drugLicenseFrontUrl || t.drugLicenseDocUrl,
        drugLicenseBackUrl: t.drugLicenseBackUrl,
        otpVerifiedAt: t.otpVerifiedAt,
        approvedAt: t.approvedAt,
        approvedBy: t.approvedBy,
        approvalNotes: t.approvalNotes,
        rejectedAt: t.rejectedAt,
        rejectedBy: t.rejectedBy,
        rejectionReason: t.rejectionReason,
        pendingPlanId: t.pendingPlanId,
        pendingBillingCycle: t.pendingBillingCycle,
        createdAt: t.createdAt,
        owner,
        subscription: latestSub,
      };
    });

    return {
      data: formatted,
      metrics: {
        total: totalMetricsCount,
        pendingReview: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        active: activeCount,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single pharmacy verification application details
   */
  static async getPharmacyVerification(id: string) {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: "COMPANY_OWNER" },
          take: 1,
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true, payments: true },
        },
      },
    });

    if (!tenant) {
      throw new Error("Pharmacy application record not found.");
    }

    return tenant;
  }

  /**
   * Approve pharmacy application and dispatch approval email with payment checkout URL
   */
  static async approvePharmacyVerification(
    id: string,
    adminUserId: string,
    data?: { planId?: string; billingCycle?: "MONTHLY" | "YEARLY"; notes?: string }
  ) {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: "COMPANY_OWNER" }, take: 1 },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } },
      },
    });

    if (!tenant) {
      throw new Error("Pharmacy application not found.");
    }

    const owner = tenant.users?.[0];
    if (!owner) {
      throw new Error("Owner user not found for this pharmacy application.");
    }

    // Resolve subscription plan
    let planId = data?.planId || tenant.pendingPlanId || tenant.subscriptions?.[0]?.planId;
    let plan = planId ? await (prisma as any).subscriptionPlan.findUnique({ where: { id: planId } }) : null;

    if (!plan) {
      plan = await (prisma as any).subscriptionPlan.findFirst({ where: { tier: "STARTER" } }) ||
             await (prisma as any).subscriptionPlan.findFirst();
    }

    const billingCycle = data?.billingCycle || tenant.pendingBillingCycle || "MONTHLY";
    const durationDays = billingCycle === "YEARLY" ? 365 : 30;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const basePrice = Number(plan.price);
    const planAmount = billingCycle === "YEARLY" ? Math.round(basePrice * 12 * 0.85) : basePrice;
    const INITIAL_LICENSE_FEE = 5000;
    const amount = planAmount + INITIAL_LICENSE_FEE;

    // Update Tenant to APPROVED_PENDING_PAYMENT
    const updatedTenant = await (prisma as any).tenant.update({
      where: { id: tenant.id },
      data: {
        verificationStatus: "APPROVED_PENDING_PAYMENT",
        approvedAt: new Date(),
        approvedBy: adminUserId,
        approvalNotes: data?.notes || "Approved by Super Admin",
        pendingPlanId: plan.id,
        pendingBillingCycle: billingCycle,
        tier: plan.tier,
      },
    });

    // Update or create pending subscription
    let subscription = tenant.subscriptions?.[0];
    if (subscription) {
      subscription = await (prisma as any).subscription.update({
        where: { id: subscription.id },
        data: {
          planId: plan.id,
          status: "PENDING",
          startDate,
          endDate,
        },
        include: { plan: true },
      });
    } else {
      subscription = await (prisma as any).subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "PENDING",
          startDate,
          endDate,
        },
        include: { plan: true },
      });
    }

    // Resolve registered password or assign a secure temporary password
    let plainPassword = tenant.tempPassword;
    if (!plainPassword) {
      plainPassword = `Pharma@${Math.floor(1000 + Math.random() * 9000)}`;
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      await (prisma as any).user.update({
        where: { id: owner.id },
        data: { passwordHash },
      });
    }

    // Generate Magic Login Token for the owner (valid for 30 days)
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
    const secret = process.env.JWT_SECRET || "default_secret";
    const magicPayload = {
      id: owner.id,
      tenantId: tenant.id,
      branchId: owner.branchId || null,
      role: owner.role,
      permissions: ["*"],
      username: owner.username,
      name: owner.name,
      email: owner.email,
      verificationStatus: "APPROVED_PENDING_PAYMENT",
    };
    const magicToken = jwt.sign(magicPayload, secret, { expiresIn: "30d" });

    // Build payment checkout URL with magic token for 1-click access
    const paymentUrl = `${clientUrl}/verification-status?tenantId=${tenant.id}&email=${encodeURIComponent(owner.email || tenant.email || "")}&token=${encodeURIComponent(magicToken)}`;

    // Send Approval Email with credentials and 1-click login URL
    const emailRecipient = owner.email || tenant.email;
    if (emailRecipient) {
      await EmailService.sendApprovalEmail({
        to: emailRecipient,
        name: owner.name || tenant.name,
        companyName: tenant.name,
        planName: plan.name,
        planTier: plan.tier,
        billingCycle,
        price: amount,
        paymentUrl,
        password: plainPassword,
      });
    }

    return {
      success: true,
      message: `Pharmacy "${tenant.name}" application approved. Approval email with payment instructions dispatched to ${emailRecipient}.`,
      tenant: updatedTenant,
      subscription,
      paymentUrl,
    };
  }

  /**
   * Reject pharmacy application with reason and notify applicant
   */
  static async rejectPharmacyVerification(
    id: string,
    adminUserId: string,
    data: { reason: string }
  ) {
    if (!data.reason || !data.reason.trim()) {
      throw new Error("A clear rejection reason is required.");
    }

    const tenant = await (prisma as any).tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: "COMPANY_OWNER" }, take: 1 },
      },
    });

    if (!tenant) {
      throw new Error("Pharmacy application not found.");
    }

    const owner = tenant.users?.[0];

    const updatedTenant = await (prisma as any).tenant.update({
      where: { id: tenant.id },
      data: {
        verificationStatus: "REJECTED",
        rejectedAt: new Date(),
        rejectedBy: adminUserId,
        rejectionReason: data.reason.trim(),
        isActive: false,
      },
    });

    const emailRecipient = owner?.email || tenant.email;
    if (emailRecipient) {
      await EmailService.sendRejectionEmail({
        to: emailRecipient,
        name: owner?.name || tenant.name,
        companyName: tenant.name,
        reason: data.reason.trim(),
      });
    }

    return {
      success: true,
      message: `Pharmacy application rejected and notification sent to ${emailRecipient}.`,
      tenant: updatedTenant,
    };
  }
}


