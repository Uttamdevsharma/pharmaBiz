import { prisma } from "./prisma";

export type PricingTierType = "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";

export interface PlanFeatureMap {
  branches: string;
  staff: string;
  inventoryTransfers: boolean;
  regionalAdmin: boolean;
  customAudit: boolean;
  apiAccess: boolean;
  branchPriceOverride: boolean;
  auditReports: string;
  [key: string]: any;
}

export interface PlanLimitDefinition {
  tier: PricingTierType;
  name: string;
  price: number;
  billingCycle: string;
  trialDays?: number;
  maxBranches: number;
  maxStaffPerBranch: number;
  maxTotalStaff?: number;
  features: PlanFeatureMap;
}

// One-time software license and server provisioning fee upon initial registration
export const INITIAL_LICENSE_FEE = 5000;
// Grace period in days where expired subscriptions can renew with zero extra fee
export const DATA_RETENTION_GRACE_DAYS = 30;
// Data retention fee applied when renewing between day 31 and day 90
export const DATA_RETENTION_FEE = 2000;
// Maximum continuous days expired data is safely held before permanent deletion
export const DATA_RETENTION_MAX_DAYS = 90;

export const CENTRAL_PLAN_DEFINITIONS: Record<Exclude<PricingTierType, "TRIAL">, PlanLimitDefinition> = {
  STARTER: {
    tier: "STARTER",
    name: "Plan 1 - Starter",
    price: 999.0,
    billingCycle: "MONTHLY",
    maxBranches: 1,
    maxStaffPerBranch: 1,
    maxTotalStaff: 1,
    features: {
      branches: "1 Branch Included (Main Branch)",
      staff: "1 Staff per Branch",
      inventoryTransfers: false,
      regionalAdmin: false,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: false,
      auditReports: "Basic Audit Trail",
    },
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Plan 2 - Growth",
    price: 1999.0,
    billingCycle: "MONTHLY",
    maxBranches: 2,
    maxStaffPerBranch: 3,
    maxTotalStaff: 6,
    features: {
      branches: "Max 2 Branches",
      staff: "3 Staff per Branch",
      inventoryTransfers: true,
      regionalAdmin: true,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: true,
      auditReports: "Standard Reports & Inter-Branch Transfers",
    },
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Plan 3 - Enterprise",
    price: 2999.0,
    billingCycle: "MONTHLY",
    maxBranches: 5,
    maxStaffPerBranch: 5,
    maxTotalStaff: 25,
    features: {
      branches: "Max 5 Branches",
      staff: "5 Staff per Branch",
      inventoryTransfers: true,
      regionalAdmin: true,
      customAudit: true,
      apiAccess: true,
      branchPriceOverride: true,
      auditReports: "Custom & VAT/MIS Compliance Export",
    },
  },
};

/**
 * Get plan limit definition by tier
 */
export function getPlanConfig(tier: string): PlanLimitDefinition {
  const normalizedTier = (tier || "STARTER").toUpperCase() as Exclude<PricingTierType, "TRIAL">;
  return CENTRAL_PLAN_DEFINITIONS[normalizedTier] || CENTRAL_PLAN_DEFINITIONS.STARTER;
}

/**
 * Calculate remaining trial days
 */
export function getTrialRemainingDays(endDate: Date | string): number {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if subscription is expired (handles both trial 7-day expiry and paid sub expiry)
 */
export function isSubscriptionExpired(subscription: any): boolean {
  if (!subscription) return true;
  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") return true;
  if (subscription.status !== "ACTIVE") return true;
  if (!subscription.endDate) return false;
  return new Date(subscription.endDate).getTime() <= Date.now();
}

/**
 * Check if tenant can add a new branch based on current plan limits
 */
export async function checkCanAddBranch(tenantId: string): Promise<{
  allowed: boolean;
  currentBranches: number;
  maxBranches: number;
  message?: string;
}> {
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: { where: { isActive: true } },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!tenant) {
    return { allowed: false, currentBranches: 0, maxBranches: 0, message: "Tenant not found" };
  }

  // Find active subscription plan, or fall back to any latest subscription, or the tenant's tier plan in database
  let plan = tenant.subscriptions?.[0]?.plan;
  if (!plan) {
    const latestSub = await (prisma as any).subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    plan = latestSub?.plan;
  }
  if (!plan && tenant.tier) {
    plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { tier: tenant.tier },
    });
  }

  const tier = (plan?.tier || tenant.tier || "STARTER") as PricingTierType;
  const fallbackConfig = getPlanConfig(tier);
  const planName = plan?.name || fallbackConfig.name;
  const maxBranches = Number(plan?.maxBranches ?? fallbackConfig.maxBranches);
  const currentBranches = tenant.branches ? tenant.branches.length : 0;

  if (currentBranches >= maxBranches) {
    return {
      allowed: false,
      currentBranches,
      maxBranches,
      message: `Branch limit reached (${currentBranches}/${maxBranches}). Your ${planName} allows at most ${maxBranches >= 999 ? "Unlimited" : maxBranches} branch store(s) (including the main branch). Please upgrade your subscription to add more branches.`,
    };
  }

  return { allowed: true, currentBranches, maxBranches };
}

/**
 * Check if tenant can add a new staff member to a branch based on plan limits
 */
export async function checkCanAddStaff(
  tenantId: string,
  branchId?: string | null
): Promise<{
  allowed: boolean;
  currentStaff: number;
  maxStaff: number;
  message?: string;
}> {
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: { where: { isActive: true } },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!tenant) {
    return { allowed: false, currentStaff: 0, maxStaff: 0, message: "Tenant not found" };
  }

  // Find active subscription plan, or fall back to any latest subscription, or the tenant's tier plan in database
  let plan = tenant.subscriptions?.[0]?.plan;
  if (!plan) {
    const latestSub = await (prisma as any).subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    plan = latestSub?.plan;
  }
  if (!plan && tenant.tier) {
    plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { tier: tenant.tier },
    });
  }

  const tier = (plan?.tier || tenant.tier || "STARTER") as PricingTierType;
  const fallbackConfig = getPlanConfig(tier);
  const planName = plan?.name || fallbackConfig.name;
  const planFeatures = (typeof plan?.features === "object" && plan?.features !== null)
    ? plan.features
    : {};

  const maxBranches = Number(plan?.maxBranches ?? fallbackConfig.maxBranches);
  const maxStaffPerBranch = Number(
    planFeatures.maxStaffPerBranch ?? (plan as any)?.maxStaffPerBranch ?? fallbackConfig.maxStaffPerBranch ?? 1
  );
  const maxTotalStaff = Number(
    planFeatures.maxTotalStaff ?? (plan as any)?.maxTotalStaff ?? fallbackConfig.maxTotalStaff ?? (maxBranches * maxStaffPerBranch)
  );

  // Exclude owner, super admin, and deleted users from staff count limit check
  const nonOwnerUsers = (tenant.users || []).filter(
    (u: any) =>
      u.role !== "COMPANY_OWNER" &&
      u.role !== "SUPER_ADMIN" &&
      !u.username?.startsWith("deleted_")
  );
  const totalStaffCount = nonOwnerUsers.length;

  // 1. Overall tenant staff limit check
  if (maxTotalStaff < 999 && totalStaffCount >= maxTotalStaff) {
    return {
      allowed: false,
      currentStaff: totalStaffCount,
      maxStaff: maxTotalStaff,
      message: `Staff limit reached: Maximum ${maxTotalStaff} staff members allowed on the ${planName} plan. Upgrade plan to add more.`,
    };
  }

  // 2. Per-branch staff limit check (if branchId is provided)
  if (branchId && maxStaffPerBranch < 999) {
    const branchStaff = nonOwnerUsers.filter((u: any) => u.branchId === branchId);
    if (branchStaff.length >= maxStaffPerBranch) {
      return {
        allowed: false,
        currentStaff: branchStaff.length,
        maxStaff: maxStaffPerBranch,
        message: `Branch staff limit reached: Maximum ${maxStaffPerBranch} staff members allowed for this branch on the ${planName} plan.`,
      };
    }
  }

  return {
    allowed: true,
    currentStaff: totalStaffCount,
    maxStaff: maxTotalStaff,
  };
}
