"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminService = void 0;
const prisma_1 = require("../../app/lib/prisma");
class SuperAdminService {
    /**
     * Plans Management
     */
    static async createPlan(data) {
        const existing = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { tier: data.tier },
        });
        if (existing) {
            throw new Error(`A subscription plan already exists for tier ${data.tier}. Please update the existing plan.`);
        }
        return await prisma_1.prisma.subscriptionPlan.create({
            data: {
                name: data.name,
                tier: data.tier,
                price: data.price,
                billingCycle: data.billingCycle,
                maxBranches: data.maxBranches,
                features: data.features || {},
                isActive: data.isActive,
            },
        });
    }
    static async listPlans() {
        return await prisma_1.prisma.subscriptionPlan.findMany({
            orderBy: { price: "asc" },
            include: {
                _count: {
                    select: { subscriptions: true },
                },
            },
        });
    }
    static async getPlanById(id) {
        const plan = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { id },
            include: {
                subscriptions: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    include: {
                        tenant: {
                            select: { id: true, name: true, tier: true, isActive: true },
                        },
                    },
                },
            },
        });
        if (!plan) {
            throw new Error("Subscription plan not found");
        }
        return plan;
    }
    static async updatePlan(id, data) {
        const plan = await prisma_1.prisma.subscriptionPlan.findUnique({ where: { id } });
        if (!plan) {
            throw new Error("Subscription plan not found");
        }
        return await prisma_1.prisma.subscriptionPlan.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.price !== undefined && { price: data.price }),
                ...(data.billingCycle && { billingCycle: data.billingCycle }),
                ...(data.maxBranches !== undefined && { maxBranches: data.maxBranches }),
                ...(data.features && { features: data.features }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }
    static async deletePlan(id) {
        const plan = await prisma_1.prisma.subscriptionPlan.findUnique({
            where: { id },
            include: { _count: { select: { subscriptions: true } } },
        });
        if (!plan) {
            throw new Error("Subscription plan not found");
        }
        if (plan._count.subscriptions > 0) {
            // Soft-deactivate if active subscriptions exist
            return await prisma_1.prisma.subscriptionPlan.update({
                where: { id },
                data: { isActive: false },
            });
        }
        return await prisma_1.prisma.subscriptionPlan.delete({ where: { id } });
    }
    /**
     * Tenant Administration
     */
    static async listTenants(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = { name: { not: "Platform HQ" } };
        if (query.search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: query.search, mode: "insensitive" } },
                        { email: { contains: query.search, mode: "insensitive" } },
                    ],
                },
            ];
        }
        if (query.tier) {
            where.tier = query.tier;
        }
        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }
        const [total, tenants] = await Promise.all([
            prisma_1.prisma.tenant.count({ where }),
            prisma_1.prisma.tenant.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { branches: true, users: true },
                    },
                    subscriptions: {
                        orderBy: { createdAt: "desc" },
                        include: { plan: true },
                        take: 1,
                    },
                },
            }),
        ]);
        // Format output without any tenant sales/POS data
        const formattedTenants = tenants.map((t) => ({
            id: t.id,
            name: t.name,
            tier: t.tier,
            isActive: t.isActive,
            email: t.email,
            phone: t.phone,
            address: t.address,
            createdAt: t.createdAt,
            branchCount: t._count.branches,
            userCount: t._count.users,
            activeSubscription: t.subscriptions[0] || null,
            subscriptions: t.subscriptions || [],
        }));
        return {
            data: formattedTenants,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    static async getTenantDetails(id) {
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id },
            include: {
                branches: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
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
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    include: { plan: true },
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        return tenant;
    }
    static async getTenantSubscription(tenantId) {
        const subscriptions = await prisma_1.prisma.subscription.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            include: { plan: true, payments: true },
        });
        return subscriptions;
    }
    static async updateTenantStatus(id, isActive) {
        const tenant = await prisma_1.prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        if (tenant.name === "Platform HQ") {
            throw new Error("Platform HQ system tenant status cannot be modified or suspended.");
        }
        return await prisma_1.prisma.tenant.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                name: true,
                tier: true,
                isActive: true,
                updatedAt: true,
            },
        });
    }
    /**
     * Platform Subscriptions List
     */
    static async listSubscriptions(page = 1, limit = 50, status) {
        const skip = (page - 1) * limit;
        const where = { tenant: { name: { not: "Platform HQ" } } };
        if (status) {
            where.status = status;
        }
        const [total, subscriptions] = await Promise.all([
            prisma_1.prisma.subscription.count({ where }),
            prisma_1.prisma.subscription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    tenant: {
                        select: { id: true, name: true, tier: true, email: true, phone: true, isActive: true },
                    },
                    plan: true,
                    payments: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            }),
        ]);
        return {
            data: subscriptions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Platform Payments & Transactions
     */
    static async listPlatformPayments(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = { tenant: { name: { not: "Platform HQ" } } };
        const [total, payments] = await Promise.all([
            prisma_1.prisma.payment.count({ where }),
            prisma_1.prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    tenant: {
                        select: { id: true, name: true, tier: true },
                    },
                    subscription: {
                        include: { plan: true },
                    },
                },
            }),
        ]);
        return {
            data: payments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Platform Analytics (No tenant sales data)
     */
    static async getPlatformAnalytics() {
        const tenantFilter = { name: { not: "Platform HQ" } };
        const [totalTenants, activeTenants, suspendedTenants, totalSubscriptions, activeSubscriptions, successfulPayments, activeSubsWithPlans, recentTenants,] = await Promise.all([
            prisma_1.prisma.tenant.count({ where: tenantFilter }),
            prisma_1.prisma.tenant.count({ where: { ...tenantFilter, isActive: true } }),
            prisma_1.prisma.tenant.count({ where: { ...tenantFilter, isActive: false } }),
            prisma_1.prisma.subscription.count({ where: { tenant: tenantFilter } }),
            prisma_1.prisma.subscription.count({ where: { status: "ACTIVE", tenant: tenantFilter } }),
            prisma_1.prisma.payment.findMany({
                where: { status: "VALIDATED", tenant: tenantFilter },
                select: { amount: true, createdAt: true },
            }),
            prisma_1.prisma.subscription.findMany({
                where: { status: "ACTIVE", tenant: tenantFilter },
                include: { plan: true, tenant: { select: { tier: true } } },
            }),
            prisma_1.prisma.tenant.findMany({
                where: tenantFilter,
                take: 5,
                orderBy: { createdAt: "desc" },
                include: { _count: { select: { branches: true, users: true } } },
            }),
        ]);
        const totalPlatformRevenue = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        // Calculate MRR from active subscriptions of client tenants
        const monthlyRecurringRevenue = activeSubsWithPlans.reduce((sum, s) => {
            const price = Number(s.plan?.price || 0);
            const isYearly = s.plan?.billingCycle === "YEARLY" ||
                ((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) > 45 * 24 * 60 * 60 * 1000);
            return isYearly ? sum + (price / 12) : sum + price;
        }, 0);
        // Plan distribution from active subscriptions
        let trialCount = 0;
        let starterCount = 0;
        let growthCount = 0;
        let enterpriseCount = 0;
        for (const sub of activeSubsWithPlans) {
            const tier = sub.plan?.tier || sub.tenant?.tier;
            if (tier === "TRIAL")
                trialCount++;
            else if (tier === "STARTER")
                starterCount++;
            else if (tier === "GROWTH")
                growthCount++;
            else if (tier === "ENTERPRISE")
                enterpriseCount++;
        }
        return {
            totalTenants,
            activeTenants,
            suspendedTenants,
            tierBreakdown: {
                trial: trialCount,
                starter: starterCount,
                growth: growthCount,
                enterprise: enterpriseCount,
            },
            totalSubscriptions,
            activeSubscriptions,
            totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
            monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
            recentTenants: recentTenants.map((t) => ({
                id: t.id,
                name: t.name,
                tier: t.tier,
                isActive: t.isActive,
                createdAt: t.createdAt,
                branchCount: t._count?.branches || 0,
                userCount: t._count?.users || 0,
            })),
        };
    }
    /**
     * ==================== PLATFORM STAFF (CTO / PROJECT MANAGER) MANAGEMENT ====================
     */
    static async listPlatformStaff() {
        return await prisma_1.prisma.user.findMany({
            where: {
                role: { in: ["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"] },
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    static async createPlatformStaff(creatorId, creatorRole, data) {
        if (creatorRole !== "SUPER_ADMIN" && data.role === "SUPER_ADMIN") {
            throw new Error("Delegated platform staff cannot create a Super Admin account.");
        }
        if (!["CTO", "PROJECT_MANAGER"].includes(data.role)) {
            throw new Error("Can only create CTO or Project Manager platform staff accounts.");
        }
        // Find or create Platform HQ System Tenant
        let systemTenant = await prisma_1.prisma.tenant.findFirst({
            where: { name: "Platform HQ" },
        });
        if (!systemTenant) {
            systemTenant = await prisma_1.prisma.tenant.create({
                data: {
                    name: "Platform HQ",
                    tier: "ENTERPRISE",
                    email: "admin@platform.system",
                    phone: "01700000000",
                    address: "Dhaka, Bangladesh",
                    isActive: true,
                },
            });
        }
        const existing = await prisma_1.prisma.user.findUnique({
            where: { username: data.username },
        });
        if (existing) {
            throw new Error("Username is already taken");
        }
        const bcrypt = require("bcryptjs");
        const passwordHash = await bcrypt.hash(data.password, 10);
        const staff = await prisma_1.prisma.user.create({
            data: {
                tenantId: systemTenant.id,
                name: data.name,
                email: data.email,
                username: data.username,
                phone: data.phone || null,
                passwordHash,
                role: data.role, // "CTO" or "PROJECT_MANAGER"
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
        return staff;
    }
    static async updatePlatformStaff(id, updaterId, updaterRole, data) {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            throw new Error("Platform staff member not found");
        }
        // Security Invariant: Super Admin cannot be modified, replaced, or degraded by delegates
        if (targetUser.role === "SUPER_ADMIN") {
            if (updaterRole !== "SUPER_ADMIN" || updaterId !== targetUser.id) {
                throw new Error("CTO / Project Manager cannot modify, reassign, or alter the Super Admin master account.");
            }
            if (data.role && data.role !== "SUPER_ADMIN") {
                throw new Error("Cannot change Super Admin role.");
            }
            if (data.isActive === false) {
                throw new Error("Super Admin account cannot be disabled.");
            }
        }
        // Delegates cannot elevate any account to Super Admin
        if (updaterRole !== "SUPER_ADMIN" && data.role === "SUPER_ADMIN") {
            throw new Error("Delegated platform staff cannot promote accounts to Super Admin.");
        }
        const updateData = {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.role !== undefined && { role: data.role }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        };
        if (data.password) {
            const bcrypt = require("bcryptjs");
            updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }
        return await prisma_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                phone: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });
    }
    static async updatePlatformStaffStatus(id, updaterId, updaterRole, isActive) {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            throw new Error("Platform staff member not found");
        }
        if (targetUser.role === "SUPER_ADMIN") {
            throw new Error("Super Admin account cannot be deactivated or disabled.");
        }
        if (targetUser.id === updaterId && !isActive) {
            throw new Error("You cannot deactivate your own platform staff account.");
        }
        return await prisma_1.prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                username: true,
                role: true,
                isActive: true,
            },
        });
    }
    static async deletePlatformStaff(id, updaterId, updaterRole) {
        const targetUser = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            throw new Error("Platform staff member not found");
        }
        if (targetUser.role === "SUPER_ADMIN") {
            throw new Error("Super Admin account cannot be deleted or removed under any circumstance.");
        }
        if (targetUser.id === updaterId) {
            throw new Error("You cannot delete your own platform staff account.");
        }
        await prisma_1.prisma.user.delete({ where: { id } });
        return { success: true, message: `Platform staff account ${targetUser.username} removed.` };
    }
    static async getPlatformPermissionsHierarchy() {
        const roles = [
            {
                role: "CTO",
                name: "Chief Technology Officer (Platform CTO)",
                description: "Technical administration, platform telemetry, system logs, plans, tenants, and delegated platform management.",
            },
            {
                role: "PROJECT_MANAGER",
                name: "Platform Project Manager",
                description: "Tenant onboarding assistance, support analytics, payment logs, plans, and platform operations oversight.",
            },
        ];
        const dbPermissions = await prisma_1.prisma.rolePermission.findMany({
            where: {
                role: { in: ["CTO", "PROJECT_MANAGER"] },
            },
        });
        const permissionMap = {};
        dbPermissions.forEach((p) => {
            if (!permissionMap[p.role])
                permissionMap[p.role] = [];
            permissionMap[p.role].push(p.permission);
        });
        const availablePermissions = [
            { id: "platform.view", label: "View Platform Console & Overview", category: "Platform Core" },
            { id: "platform.analytics", label: "View Platform Revenue & MRR Analytics", category: "Analytics" },
            { id: "platform.tenants", label: "Manage Pharmacies & Tenant Statuses", category: "Operations" },
            { id: "platform.plans", label: "Manage Subscription Plans & Tiers", category: "Operations" },
            { id: "platform.support", label: "View Subscriptions & Tenant History", category: "Operations" },
            { id: "platform.payments", label: "View Payment Transactions & Invoices", category: "Operations" },
            { id: "platform.staff", label: "Manage CTO & PM Platform Delegates", category: "Platform Core" },
            { id: "platform.logs", label: "View System Telemetry & Audit Logs", category: "Technical" },
            { id: "platform.tech_settings", label: "Configure Platform Theme & Branding", category: "Technical" },
        ];
        return {
            roles,
            activePermissions: permissionMap,
            availablePermissions,
        };
    }
    static async updatePlatformRolePermissions(role, permissions) {
        if (!["CTO", "PROJECT_MANAGER"].includes(role)) {
            throw new Error("Can only customize permissions for CTO and Project Manager roles.");
        }
        // Filter out forbidden / root destructive permissions
        const sanitizedPermissions = permissions.filter((p) => !p.startsWith("platform.destroy") &&
            !p.startsWith("platform.owner") &&
            !p.startsWith("platform.super_admin"));
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({
                where: { role: role },
            });
            if (sanitizedPermissions.length > 0) {
                await tx.rolePermission.createMany({
                    data: sanitizedPermissions.map((p) => ({
                        role: role,
                        permission: p,
                    })),
                });
            }
        });
        return { success: true, role, permissions: sanitizedPermissions };
    }
}
exports.SuperAdminService = SuperAdminService;
