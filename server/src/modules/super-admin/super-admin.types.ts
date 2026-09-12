export interface PharmacyGrowthPoint {
  label: string;
  date: string;
  count: number;
  cumulative: number;
}

export interface SubscriptionByPlanItem {
  tier: "STARTER" | "GROWTH" | "ENTERPRISE";
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SubscriptionByPlanData {
  starter: number;
  growth: number;
  enterprise: number;
  total: number;
  breakdown: SubscriptionByPlanItem[];
}

export interface PlatformAnalyticsResponse {
  // 4 Primary Date-Filtered Stat Cards
  newPharmacies: number;
  newSubscriptions: number;
  subscriptionRevenue: number;
  pendingReview: number;

  // 2 Primary Charts
  pharmacyGrowth: PharmacyGrowthPoint[];
  subscriptionByPlan: SubscriptionByPlanData;

  // Maintained for backward compatibility (e.g. AnalyticsTab)
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  tierBreakdown: {
    trial?: number;
    starter: number;
    growth: number;
    enterprise: number;
  };
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalPlatformRevenue: number;
  monthlyRecurringRevenue: number;
  recentTenants?: Array<{
    id: string;
    name: string;
    tier: string;
    isActive: boolean;
    createdAt: Date;
    branchCount: number;
  }>;
}

