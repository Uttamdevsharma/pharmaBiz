"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStaffLimit = exports.checkBranchLimit = exports.requireTier = exports.requireActiveSubscription = void 0;
const prisma_1 = require("../app/lib/prisma");
const planLimits_1 = require("../app/lib/planLimits");
const TIER_ORDER = {
    TRIAL: 0,
    STARTER: 1,
    GROWTH: 2,
    ENTERPRISE: 3,
};
const requireActiveSubscription = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        // Platform roles bypass tenant subscription checks
        if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(req.user.role)) {
            next();
            return;
        }
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            include: {
                subscriptions: {
                    where: { status: "ACTIVE" },
                    include: { plan: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });
        if (!tenant) {
            res.status(404).json({ success: false, message: "Tenant not found" });
            return;
        }
        if (!tenant.isActive) {
            res.status(403).json({
                success: false,
                message: "Your pharmacy account is suspended. Please contact platform support.",
            });
            return;
        }
        const activeSub = tenant.subscriptions && tenant.subscriptions[0];
        const isTrial = activeSub?.plan?.tier === "TRIAL" || tenant.tier === "TRIAL";
        // Check if subscription exists and is not expired
        if (!activeSub || (0, planLimits_1.isSubscriptionExpired)(activeSub)) {
            if (isTrial) {
                res.status(402).json({
                    success: false,
                    isTrial: true,
                    isTrialExpired: true,
                    isExpired: true,
                    message: "Your 7-day Free Trial has expired. Please upgrade to a paid subscription plan to continue managing your pharmacy.",
                    tier: "TRIAL",
                    trialDaysRemaining: 0,
                });
                return;
            }
            res.status(402).json({
                success: false,
                isTrial: false,
                isExpired: true,
                message: "No active subscription found. Please renew or upgrade your subscription plan.",
                tier: tenant.tier,
            });
            return;
        }
        // Attach subscription info to request
        const trialDaysRemaining = isTrial ? (0, planLimits_1.getTrialRemainingDays)(activeSub.endDate) : undefined;
        req.subscription = activeSub;
        req.tenant = tenant;
        req.isTrial = isTrial;
        req.trialDaysRemaining = trialDaysRemaining;
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to verify subscription" });
    }
};
exports.requireActiveSubscription = requireActiveSubscription;
const requireTier = (minTier) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }
            if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(req.user.role)) {
                next();
                return;
            }
            const tenant = await prisma_1.prisma.tenant.findUnique({
                where: { id: req.user.tenantId },
            });
            if (!tenant) {
                res.status(404).json({ success: false, message: "Tenant not found" });
                return;
            }
            const currentTierLevel = TIER_ORDER[tenant.tier] || 0;
            const requiredTierLevel = TIER_ORDER[minTier] || 0;
            if (tenant.tier !== "TRIAL" && currentTierLevel < requiredTierLevel) {
                res.status(403).json({
                    success: false,
                    message: `This feature requires a ${minTier} plan or higher. Your current plan is ${tenant.tier}. Please upgrade your subscription.`,
                    currentTier: tenant.tier,
                    requiredTier: minTier,
                });
                return;
            }
            next();
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Failed to check tier permissions" });
        }
    };
};
exports.requireTier = requireTier;
const checkBranchLimit = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(req.user.role)) {
            next();
            return;
        }
        const check = await (0, planLimits_1.checkCanAddBranch)(req.user.tenantId);
        if (!check.allowed) {
            res.status(403).json({
                success: false,
                message: check.message,
                currentBranches: check.currentBranches,
                maxBranches: check.maxBranches,
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to check branch limits" });
    }
};
exports.checkBranchLimit = checkBranchLimit;
const checkStaffLimit = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(req.user.role)) {
            next();
            return;
        }
        const targetBranchId = req.body?.branchId || null;
        const check = await (0, planLimits_1.checkCanAddStaff)(req.user.tenantId, targetBranchId);
        if (!check.allowed) {
            res.status(403).json({
                success: false,
                message: check.message,
                currentStaff: check.currentStaff,
                maxStaff: check.maxStaff,
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to check staff limits" });
    }
};
exports.checkStaffLimit = checkStaffLimit;
