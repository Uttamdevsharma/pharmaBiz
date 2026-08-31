export interface PlatformAnalyticsResponse {
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
  recentTenants: Array<{
    id: string;
    name: string;
    tier: string;
    isActive: boolean;
    createdAt: Date;
    branchCount: number;
  }>;
}
