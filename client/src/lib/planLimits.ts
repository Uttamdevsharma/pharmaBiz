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

export const CENTRAL_CLIENT_PLANS: Record<Tier, PlanConfig> = {
  TRIAL: {
    tier: "TRIAL",
    planNumber: 0,
    name: "Plan 0 - Free Trial",
    badge: "7-Day Trial",
    price: 0,
    billingCycle: "7 Days",
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
  const normalizedTier = (tier || "TRIAL").toUpperCase() as Tier;
  return CENTRAL_CLIENT_PLANS[normalizedTier] || CENTRAL_CLIENT_PLANS.TRIAL;
}

export function calculateRemainingTrialDays(endDate?: string | Date): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
