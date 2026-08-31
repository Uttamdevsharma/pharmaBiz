"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const planLimits_1 = require("../../app/lib/planLimits");
class TenantService {
    static async getProfile(tenantId) {
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                _count: {
                    select: {
                        branches: { where: { isActive: true } },
                        users: { where: { isActive: true } },
                        products: { where: { isActive: true } },
                    },
                },
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
        const currentSub = tenant.subscriptions[0] || null;
        const tier = (currentSub?.plan?.tier || tenant.tier || "TRIAL");
        const planConfig = (0, planLimits_1.getPlanConfig)(tier);
        const isTrial = tier === "TRIAL";
        const isExpired = currentSub ? (0, planLimits_1.isSubscriptionExpired)(currentSub) : true;
        const trialDaysRemaining = isTrial && currentSub?.endDate ? (0, planLimits_1.getTrialRemainingDays)(currentSub.endDate) : 0;
        return {
            id: tenant.id,
            name: tenant.name,
            tier,
            isActive: tenant.isActive,
            email: tenant.email,
            phone: tenant.phone,
            address: tenant.address,
            createdAt: tenant.createdAt,
            isTrial,
            trialDaysRemaining,
            isExpired,
            planConfig,
            stats: {
                activeBranches: tenant._count.branches,
                activeUsers: tenant._count.users,
                activeProducts: tenant._count.products,
            },
            currentSubscription: currentSub,
        };
    }
    static async updateProfile(tenantId, data) {
        const updated = await prisma_1.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email && { email: data.email }),
                ...(data.phone && { phone: data.phone }),
                ...(data.address && { address: data.address }),
            },
        });
        return updated;
    }
    static async getSubscriptionAndLimits(tenantId) {
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                branches: { where: { isActive: true } },
                users: { where: { isActive: true } },
                subscriptions: {
                    where: { status: "ACTIVE" },
                    include: { plan: true },
                    orderBy: { endDate: "desc" },
                    take: 1,
                },
            },
        });
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        const activeSub = tenant.subscriptions && tenant.subscriptions[0];
        const tier = (activeSub?.plan?.tier || tenant.tier || "TRIAL");
        const planConfig = (0, planLimits_1.getPlanConfig)(tier);
        const maxBranches = activeSub?.plan?.maxBranches || planConfig.maxBranches;
        const branchCount = tenant.branches ? tenant.branches.length : 0;
        const nonOwnerStaff = (tenant.users || []).filter((u) => u.role !== "COMPANY_OWNER");
        const staffCount = nonOwnerStaff.length;
        const maxStaff = tier === "TRIAL" ? 1 : planConfig.maxTotalStaff || 999;
        return {
            tenantId: tenant.id,
            tier,
            subscription: activeSub || null,
            planConfig,
            usage: {
                activeBranches: branchCount,
                maxBranches,
                isBranchLimitReached: branchCount >= maxBranches,
                activeStaff: staffCount,
                maxStaff,
                isStaffLimitReached: staffCount >= maxStaff,
            },
            features: {
                interBranchTransfer: tier !== "STARTER" && tier !== "TRIAL",
                regionalAdmin: tier !== "STARTER" && tier !== "TRIAL",
                branchPriceOverride: tier !== "STARTER" && tier !== "TRIAL",
                customAudit: tier === "ENTERPRISE",
                apiAccess: tier === "ENTERPRISE",
            },
        };
    }
}
exports.TenantService = TenantService;
