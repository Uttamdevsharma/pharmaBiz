import { prisma } from "../../app/lib/prisma";
import { SubscribeInput, ChangePlanInput } from "./subscription.validation";
import {
  CENTRAL_PLAN_DEFINITIONS,
  PricingTierType,
  getPlanConfig,
  getTrialRemainingDays,
  isSubscriptionExpired,
} from "../../app/lib/planLimits";

export class SubscriptionService {
  /**
   * List all available plans
   */
  static async listAvailablePlans() {
    const plans = await (prisma as any).subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    return plans.map((p: any) => {
      const feat = (typeof p.features === "object" && p.features !== null) ? p.features : {};
      const fallback: any = CENTRAL_PLAN_DEFINITIONS[p.tier as PricingTierType] || CENTRAL_PLAN_DEFINITIONS.TRIAL;
      return {
        ...p,
        maxStaffPerBranch: feat.maxStaffPerBranch ?? fallback.maxStaffPerBranch ?? 1,
        maxTotalStaff: feat.maxTotalStaff ?? fallback.maxTotalStaff ?? (p.maxBranches * (feat.maxStaffPerBranch ?? 1)),
        trialDays: feat.trialDays ?? fallback.trialDays ?? 7,
      };
    });
  }

  static async getPlanDetails(planId: string) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {};
    const fallback: any = CENTRAL_PLAN_DEFINITIONS[plan.tier as PricingTierType] || CENTRAL_PLAN_DEFINITIONS.TRIAL;
    return {
      ...plan,
      maxStaffPerBranch: feat.maxStaffPerBranch ?? fallback.maxStaffPerBranch ?? 1,
      maxTotalStaff: feat.maxTotalStaff ?? fallback.maxTotalStaff ?? (plan.maxBranches * (feat.maxStaffPerBranch ?? 1)),
      trialDays: feat.trialDays ?? fallback.trialDays ?? 7,
    };
  }

  /**
   * Get current active subscription and usage for tenant
   */
  static async getCurrentSubscription(tenantId: string) {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: { where: { isActive: true } },
        users: { where: { isActive: true } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const currentSub = tenant.subscriptions && tenant.subscriptions[0];
    const tier = (currentSub?.plan?.tier || tenant.tier || "TRIAL") as PricingTierType;
    const planConfig = getPlanConfig(tier);

    const isTrial = tier === "TRIAL";
    const isExpired = currentSub ? isSubscriptionExpired(currentSub) : true;
    const trialDaysRemaining = isTrial && currentSub?.endDate ? getTrialRemainingDays(currentSub.endDate) : 0;
    const isTrialExpired = isTrial && isExpired;

    const planFeatures = (typeof currentSub?.plan?.features === "object" && currentSub?.plan?.features !== null)
      ? currentSub.plan.features
      : {};

    const branchCount = tenant.branches ? tenant.branches.length : 0;
    const maxBranches = currentSub?.plan?.maxBranches ?? planConfig.maxBranches;

    const nonOwnerStaff = (tenant.users || []).filter((u: any) => u.role !== "COMPANY_OWNER");
    const staffCount = nonOwnerStaff.length;

    const maxStaffPerBranch = Number(
      planFeatures.maxStaffPerBranch ?? (currentSub?.plan as any)?.maxStaffPerBranch ?? planConfig.maxStaffPerBranch ?? 1
    );
    const maxStaff = Number(
      planFeatures.maxTotalStaff ?? (currentSub?.plan as any)?.maxTotalStaff ?? planConfig.maxTotalStaff ?? (isTrial ? 1 : 999)
    );

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tier,
      subscription: currentSub || null,
      isTrial,
      isTrialExpired,
      trialDaysRemaining,
      isExpired,
      planConfig: {
        ...planConfig,
        name: currentSub?.plan?.name || planConfig.name,
        price: currentSub?.plan ? Number(currentSub.plan.price) : planConfig.price,
        billingCycle: currentSub?.plan?.billingCycle || planConfig.billingCycle,
        maxBranches,
        maxStaffPerBranch,
        maxTotalStaff: maxStaff,
      },
      usage: {
        currentBranches: branchCount,
        maxBranches,
        remainingBranches: Math.max(0, maxBranches - branchCount),
        currentStaff: staffCount,
        maxStaff,
        remainingStaff: Math.max(0, maxStaff - staffCount),
        maxStaffPerBranch,
      },
      features: {
        interBranchTransfer: planFeatures.inventoryTransfers ?? (tier !== "STARTER" && tier !== "TRIAL"),
        regionalAdmin: planFeatures.regionalAdmin ?? (tier !== "STARTER" && tier !== "TRIAL"),
        customAudit: planFeatures.customAudit ?? (tier === "ENTERPRISE"),
        apiAccess: planFeatures.apiAccess ?? (tier === "ENTERPRISE"),
        branchPriceOverride: planFeatures.branchPriceOverride ?? (tier !== "STARTER" && tier !== "TRIAL"),
      },
    };
  }

  /**
   * Get tenant subscription history
   */
  static async getSubscriptionHistory(tenantId: string) {
    return await (prisma as any).subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Create or Select a plan (Pending state until payment validated)
   */
  static async createSubscription(tenantId: string, data: SubscribeInput) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error("Invalid or inactive subscription plan");
    }

    const durationDays = data.billingCycle === "YEARLY" ? 365 : 30;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await (prisma as any).subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status: "PENDING",
        startDate,
        endDate,
        autoRenew: data.autoRenew,
      },
      include: { plan: true },
    });

    return subscription;
  }

  /**
   * Change or Upgrade/Downgrade Plan (from Trial or previous plan)
   */
  static async changePlan(tenantId: string, data: ChangePlanInput) {
    const newPlan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id: data.newPlanId },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new Error("Target subscription plan not found or inactive");
    }

    // Check branch count if downgrading
    const activeBranches = await (prisma as any).branch.count({
      where: { tenantId, isActive: true },
    });

    if (activeBranches > newPlan.maxBranches) {
      throw new Error(
        `Cannot change to ${newPlan.name}. You currently have ${activeBranches} active branches, but this plan allows at most ${newPlan.maxBranches}. Please deactivate extra branches first.`
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await (prisma as any).subscription.create({
      data: {
        tenantId,
        planId: newPlan.id,
        status: "PENDING",
        startDate,
        endDate,
      },
      include: { plan: true },
    });

    return subscription;
  }

  /**
   * Renew Subscription
   */
  static async renewSubscription(tenantId: string) {
    const currentSub = await (prisma as any).subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    if (!currentSub) {
      throw new Error("No existing subscription found to renew");
    }

    const durationDays = currentSub.plan.billingCycle === "YEARLY" ? 365 : 30;
    const baseDate = new Date(currentSub.endDate) > new Date() ? new Date(currentSub.endDate) : new Date();
    const newEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newSub = await (prisma as any).subscription.create({
      data: {
        tenantId,
        planId: currentSub.planId,
        status: "PENDING",
        startDate: baseDate,
        endDate: newEndDate,
        autoRenew: currentSub.autoRenew,
      },
      include: { plan: true },
    });

    return newSub;
  }

  /**
   * Cancel Subscription
   */
  static async cancelSubscription(tenantId: string) {
    const currentSub = await (prisma as any).subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (!currentSub) {
      throw new Error("No active subscription found to cancel");
    }

    const updated = await (prisma as any).subscription.update({
      where: { id: currentSub.id },
      data: {
        status: "CANCELLED",
        autoRenew: false,
      },
    });

    return updated;
  }
}
