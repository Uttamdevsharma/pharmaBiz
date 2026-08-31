import { prisma } from "../../app/lib/prisma";
import { CreatePlanInput, UpdatePlanInput, ListTenantsQuery } from "./super-admin.validation";
import { PlatformAnalyticsResponse } from "./super-admin.types";

export class SuperAdminService {
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

    return await (prisma as any).subscriptionPlan.create({
      data: {
        name: data.name,
        tier: data.tier,
        price: data.price,
        billingCycle: data.billingCycle,
        maxBranches: data.maxBranches,
        features: data.features || {},
        isActive: data.isActive,
      },
    });
  }

  static async listPlans() {
    return await (prisma as any).subscriptionPlan.findMany({
      orderBy: { price: "asc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
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

    return plan;
  }

  static async updatePlan(id: string, data: UpdatePlanInput) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    return await (prisma as any).subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.billingCycle && { billingCycle: data.billingCycle }),
        ...(data.maxBranches !== undefined && { maxBranches: data.maxBranches }),
        ...(data.features && { features: data.features }),
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
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
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
  static async listSubscriptions(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenant: { name: { not: "Platform HQ" } } };

    if (status) {
      where.status = status;
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
  static async listPlatformPayments(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = { tenant: { name: { not: "Platform HQ" } } };

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
   * Platform Analytics (No tenant sales data)
   */
  static async getPlatformAnalytics(): Promise<PlatformAnalyticsResponse> {
    const tenantFilter = { name: { not: "Platform HQ" } };

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSubscriptions,
      activeSubscriptions,
      successfulPayments,
      activeSubsWithPlans,
      recentTenants,
    ] = await Promise.all([
      (prisma as any).tenant.count({ where: tenantFilter }),
      (prisma as any).tenant.count({ where: { ...tenantFilter, isActive: true } }),
      (prisma as any).tenant.count({ where: { ...tenantFilter, isActive: false } }),
      (prisma as any).subscription.count({ where: { tenant: tenantFilter } }),
      (prisma as any).subscription.count({ where: { status: "ACTIVE", tenant: tenantFilter } }),
      (prisma as any).payment.findMany({
        where: { status: "VALIDATED", tenant: tenantFilter },
        select: { amount: true, createdAt: true },
      }),
      (prisma as any).subscription.findMany({
        where: { status: "ACTIVE", tenant: tenantFilter },
        include: { plan: true, tenant: { select: { tier: true } } },
      }),
      (prisma as any).tenant.findMany({
        where: tenantFilter,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { branches: true, users: true } } },
      }),
    ]);

    const totalPlatformRevenue = successfulPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    );

    // Calculate MRR from active subscriptions of client tenants
    const monthlyRecurringRevenue = activeSubsWithPlans.reduce((sum: number, s: any) => {
      const price = Number(s.plan?.price || 0);
      const isYearly = s.plan?.billingCycle === "YEARLY" ||
        ((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) > 45 * 24 * 60 * 60 * 1000);
      return isYearly ? sum + (price / 12) : sum + price;
    }, 0);

    // Plan distribution from active subscriptions
    let trialCount = 0;
    let starterCount = 0;
    let growthCount = 0;
    let enterpriseCount = 0;

    for (const sub of activeSubsWithPlans) {
      const tier = sub.plan?.tier || sub.tenant?.tier;
      if (tier === "TRIAL") trialCount++;
      else if (tier === "STARTER") starterCount++;
      else if (tier === "GROWTH") growthCount++;
      else if (tier === "ENTERPRISE") enterpriseCount++;
    }

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      tierBreakdown: {
        trial: trialCount,
        starter: starterCount,
        growth: growthCount,
        enterprise: enterpriseCount,
      },
      totalSubscriptions,
      activeSubscriptions,
      totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
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
}
