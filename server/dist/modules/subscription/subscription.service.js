"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const planLimits_1 = require("../../app/lib/planLimits");
class SubscriptionService {
    /**
     * List all available plans
     */
    static async listAvailablePlans() {
        return await prisma_1.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: "asc" },
        });
    }
    static async getPlanDetails(planId) {
        const plan = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            throw new Error("Subscription plan not found");
        }
        return plan;
    }
    /**
     * Get current active subscription and usage for tenant
     */
    static async getCurrentSubscription(tenantId) {
        const tenant = await prisma_1.prisma.tenant.findUnique({
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
        const tier = (currentSub?.plan?.tier || tenant.tier || "TRIAL");
        const planConfig = (0, planLimits_1.getPlanConfig)(tier);
        const isTrial = tier === "TRIAL";
        const isExpired = currentSub ? (0, planLimits_1.isSubscriptionExpired)(currentSub) : true;
        const trialDaysRemaining = isTrial && currentSub?.endDate ? (0, planLimits_1.getTrialRemainingDays)(currentSub.endDate) : 0;
        const isTrialExpired = isTrial && isExpired;
        const branchCount = tenant.branches ? tenant.branches.length : 0;
        const maxBranches = currentSub?.plan?.maxBranches || planConfig.maxBranches;
        const nonOwnerStaff = (tenant.users || []).filter((u) => u.role !== "COMPANY_OWNER");
        const staffCount = nonOwnerStaff.length;
        const maxStaff = isTrial ? 1 : planConfig.maxTotalStaff || 999;
        return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            tier,
            subscription: currentSub || null,
            isTrial,
            isTrialExpired,
            trialDaysRemaining,
            isExpired,
            planConfig,
            usage: {
                currentBranches: branchCount,
                maxBranches,
                remainingBranches: Math.max(0, maxBranches - branchCount),
                currentStaff: staffCount,
                maxStaff,
                remainingStaff: Math.max(0, maxStaff - staffCount),
            },
            features: {
                interBranchTransfer: tier !== "STARTER" && tier !== "TRIAL",
                regionalAdmin: tier !== "STARTER" && tier !== "TRIAL",
                customAudit: tier === "ENTERPRISE",
                apiAccess: tier === "ENTERPRISE",
                branchPriceOverride: tier !== "STARTER" && tier !== "TRIAL",
            },
        };
    }
    /**
     * Get tenant subscription history
     */
    static async getSubscriptionHistory(tenantId) {
        return await prisma_1.prisma.subscription.findMany({
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
    static async createSubscription(tenantId, data) {
        const plan = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { id: data.planId },
        });
        if (!plan || !plan.isActive) {
            throw new Error("Invalid or inactive subscription plan");
        }
        const durationDays = data.billingCycle === "YEARLY" ? 365 : 30;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const subscription = await prisma_1.prisma.subscription.create({
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
    static async changePlan(tenantId, data) {
        const newPlan = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { id: data.newPlanId },
        });
        if (!newPlan || !newPlan.isActive) {
            throw new Error("Target subscription plan not found or inactive");
        }
        // Check branch count if downgrading
        const activeBranches = await prisma_1.prisma.branch.count({
            where: { tenantId, isActive: true },
        });
        if (activeBranches > newPlan.maxBranches) {
            throw new Error(`Cannot change to ${newPlan.name}. You currently have ${activeBranches} active branches, but this plan allows at most ${newPlan.maxBranches}. Please deactivate extra branches first.`);
        }
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const subscription = await prisma_1.prisma.subscription.create({
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
    static async renewSubscription(tenantId) {
        const currentSub = await prisma_1.prisma.subscription.findFirst({
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
        const newSub = await prisma_1.prisma.subscription.create({
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
    static async cancelSubscription(tenantId) {
        const currentSub = await prisma_1.prisma.subscription.findFirst({
            where: { tenantId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
        });
        if (!currentSub) {
            throw new Error("No active subscription found to cancel");
        }
        const updated = await prisma_1.prisma.subscription.update({
            where: { id: currentSub.id },
            data: {
                status: "CANCELLED",
                autoRenew: false,
            },
        });
        return updated;
    }
}
exports.SubscriptionService = SubscriptionService;
