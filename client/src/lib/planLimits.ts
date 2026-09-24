import { Tier } from "@/types";

export interface PlanFeatureMap {
  branches: string;
  staff: string;
  inventoryTransfers: boolean;
  regionalAdmin: boolean;
  customAudit: boolean;
  apiAccess: boolean;
  branchPriceOverride: boolean;
  auditReports: string;
}

export interface PlanConfig {
  tier: Tier;
  planNumber: number;
  name: string;
  badge: string;
  price: number;
  billingCycle: string;
  trialDays?: number;
  maxBranches: number;
  maxStaffPerBranch: number;
  maxTotalStaff?: number;
  features: PlanFeatureMap;
}

export const TIER_ORDER: Record<string, number> = {
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

export const CENTRAL_CLIENT_PLANS: Record<Exclude<Tier, "TRIAL">, PlanConfig> = {
  STARTER: {
    tier: "STARTER",
    planNumber: 1,
    name: "Plan 1 - Starter",
    badge: "Starter",
    price: 500,
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
    planNumber: 2,
    name: "Plan 2 - Growth",
    badge: "Most Popular",
    price: 1500,
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
    planNumber: 3,
    name: "Plan 3 - Enterprise",
    badge: "Full Scale",
    price: 3000,
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

export function getClientPlanConfig(tier?: string): PlanConfig {
  const normalizedTier = (tier || "STARTER").toUpperCase() as Exclude<Tier, "TRIAL">;
  return CENTRAL_CLIENT_PLANS[normalizedTier] || CENTRAL_CLIENT_PLANS.STARTER;
}

export function calculateRemainingTrialDays(endDate?: string | Date): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
