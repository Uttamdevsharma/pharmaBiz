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

export const CENTRAL_PLAN_DEFINITIONS: Record<PricingTierType, PlanLimitDefinition> = {
  TRIAL: {
    tier: "TRIAL",
    name: "Plan 0 - Free Trial",
    price: 0.0,
    billingCycle: "MONTHLY",
    trialDays: 7,
    maxBranches: 1,
    maxStaffPerBranch: 1,
    maxTotalStaff: 1,
    features: {
      branches: "1 Branch (Main Branch Only)",
      staff: "1 Staff Member",
      inventoryTransfers: false,
      regionalAdmin: false,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: false,
      auditReports: "Basic Audit Trail (7-Day Trial)",
    },
  },
  STARTER: {
    tier: "STARTER",
    name: "Plan 1 - Starter",
    price: 500.0,
    billingCycle: "MONTHLY",
    maxBranches: 2,
    maxStaffPerBranch: 1,
    maxTotalStaff: 2,
    features: {
      branches: "Max 2 Branches (Main + 1)",
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
    price: 1500.0,
    billingCycle: "MONTHLY",
    maxBranches: 3,
    maxStaffPerBranch: 3,
    maxTotalStaff: 9,
    features: {
      branches: "Max 3 Branches",
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
    price: 3000.0,
    billingCycle: "MONTHLY",
    maxBranches: 999,
    maxStaffPerBranch: 999,
    maxTotalStaff: 999,
    features: {
      branches: "Unlimited Branches",
      staff: "Unlimited Staff",
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
  const normalizedTier = (tier || "TRIAL").toUpperCase() as PricingTierType;
  return CENTRAL_PLAN_DEFINITIONS[normalizedTier] || CENTRAL_PLAN_DEFINITIONS.TRIAL;
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

  const activeSub = tenant.subscriptions && tenant.subscriptions[0];
  const tier = (activeSub?.plan?.tier || tenant.tier || "TRIAL") as PricingTierType;
  const planConfig = getPlanConfig(tier);
  const maxBranches = activeSub?.plan?.maxBranches || planConfig.maxBranches;
  const currentBranches = tenant.branches ? tenant.branches.length : 0;

  if (currentBranches >= maxBranches) {
    return {
      allowed: false,
      currentBranches,
      maxBranches,
      message: `Branch limit reached (${currentBranches}/${maxBranches}). Your ${planConfig.name} allows at most ${maxBranches >= 999 ? "Unlimited" : maxBranches} branch(es). Please upgrade your subscription to add more branches.`,
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

  const activeSub = tenant.subscriptions && tenant.subscriptions[0];
  const tier = (activeSub?.plan?.tier || tenant.tier || "TRIAL") as PricingTierType;
  const planConfig = getPlanConfig(tier);

  // Exclude owner from staff count limit check (or check non-owner staff)
  const nonOwnerUsers = (tenant.users || []).filter((u: any) => u.role !== "COMPANY_OWNER");
  const totalStaffCount = nonOwnerUsers.length;

  // 1. For TRIAL: Total 1 staff allowed
  if (tier === "TRIAL") {
    if (totalStaffCount >= 1) {
      return {
        allowed: false,
        currentStaff: totalStaffCount,
        maxStaff: 1,
        message: `Staff limit reached (1/1 staff on ${planConfig.name}). Plan 0 - Free Trial allows a maximum of 1 staff member. Please upgrade to a paid plan to add more staff.`,
      };
    }
    return { allowed: true, currentStaff: totalStaffCount, maxStaff: 1 };
  }

  // 2. For paid plans: Check per-branch limit if branchId is provided
  if (branchId && planConfig.maxStaffPerBranch < 999) {
    const branchStaff = nonOwnerUsers.filter((u: any) => u.branchId === branchId);
    if (branchStaff.length >= planConfig.maxStaffPerBranch) {
      return {
        allowed: false,
        currentStaff: branchStaff.length,
        maxStaff: planConfig.maxStaffPerBranch,
        message: `Branch staff limit reached (${branchStaff.length}/${planConfig.maxStaffPerBranch} for this branch on ${planConfig.name}). Please upgrade your plan to assign more staff to this branch.`,
      };
    }
  }

  return {
    allowed: true,
    currentStaff: totalStaffCount,
    maxStaff: planConfig.maxTotalStaff || 999,
  };
}
