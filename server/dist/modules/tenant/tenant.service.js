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
        const activeSub = (tenant.subscriptions || []).find((s) => s.status === "ACTIVE") || tenant.subscriptions[0] || null;
        let plan = activeSub?.plan;
        if (!plan && tenant.tier) {
            plan = await prisma_1.prisma.subscriptionPlan.findUnique({
                where: { tier: tenant.tier },
            });
        }
        const tier = (plan?.tier || tenant.tier || "STARTER");
        const planConfig = (0, planLimits_1.getPlanConfig)(tier);
        const isTrial = tier === "TRIAL";
        const isExpired = activeSub ? (0, planLimits_1.isSubscriptionExpired)(activeSub) : true;
        const trialDaysRemaining = isTrial && activeSub?.endDate ? (0, planLimits_1.getTrialRemainingDays)(activeSub.endDate) : 0;
        const planFeatures = (typeof plan?.features === "object" && plan?.features !== null) ? plan.features : {};
        const maxBranches = Number(plan?.maxBranches ?? planConfig.maxBranches);
        const maxStaffPerBranch = Number(planFeatures.maxStaffPerBranch ?? plan?.maxStaffPerBranch ?? planConfig.maxStaffPerBranch ?? 1);
        const maxTotalStaff = Number(planFeatures.maxTotalStaff ?? plan?.maxTotalStaff ?? planConfig.maxTotalStaff ?? (maxBranches * maxStaffPerBranch));
        return {
            id: tenant.id,
            name: tenant.name,
            tier,
            isActive: tenant.isActive,
            email: tenant.email,
            phone: tenant.phone,
            address: tenant.address,
            logoUrl: tenant.logoUrl || null,
            logoPublicId: tenant.logoPublicId || null,
            createdAt: tenant.createdAt,
            isTrial,
            trialDaysRemaining,
            isExpired,
            maxBranches,
            maxStaffPerBranch,
            maxTotalStaff,
            planConfig: {
                ...planConfig,
                name: plan?.name || planConfig.name,
                price: plan ? Number(plan.price) : planConfig.price,
                billingCycle: plan?.billingCycle || planConfig.billingCycle,
                maxBranches,
                maxStaffPerBranch,
                maxTotalStaff,
                features: {
                    ...planConfig.features,
                    ...planFeatures,
                    branches: `${maxBranches >= 999 ? "Unlimited" : maxBranches} Branch${maxBranches === 1 ? "" : "es"}`,
                    staff: `${maxStaffPerBranch >= 999 ? "Unlimited" : maxStaffPerBranch} Staff per Branch`,
                },
            },
            stats: {
                activeBranches: tenant._count.branches,
                activeUsers: tenant._count.users,
                activeProducts: tenant._count.products,
            },
            currentSubscription: activeSub,
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
                ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
                ...(data.logoPublicId !== undefined && { logoPublicId: data.logoPublicId || null }),
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
        const nonOwnerStaff = (tenant.users || []).filter((u) => u.role !== "COMPANY_OWNER" && u.role !== "SUPER_ADMIN" && !u.username?.startsWith("deleted_"));
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
    static async getBillingLedger(tenantId) {
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                branches: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        phone: true,
                        email: true,
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
                        phone: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        plan: true,
                        payments: {
                            orderBy: { createdAt: "desc" },
                        },
                    },
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        subscription: {
                            include: { plan: true },
                        },
                    },
                },
            },
        });
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        const ownerUser = (tenant.users || []).find((u) => u.role === "COMPANY_OWNER") || tenant.users?.[0] || null;
        return {
            tenant,
            ownerUser,
        };
    }
}
exports.TenantService = TenantService;
