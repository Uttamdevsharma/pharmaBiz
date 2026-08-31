import { Request, Response, NextFunction } from "express";
import { prisma } from "../app/lib/prisma";
import {
  PricingTierType,
  getPlanConfig,
  getTrialRemainingDays,
  isSubscriptionExpired,
  checkCanAddBranch,
  checkCanAddStaff,
} from "../app/lib/planLimits";

const TIER_ORDER: Record<string, number> = {
  TRIAL: 0,
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Super Admin bypasses tenant subscription checks
    if (req.user.role === "SUPER_ADMIN") {
      next();
      return;
    }

    const tenant = await (prisma as any).tenant.findUnique({
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
    if (!activeSub || isSubscriptionExpired(activeSub)) {
      if (isTrial) {
        res.status(402).json({
          success: false,
          isTrial: true,
          isTrialExpired: true,
          isExpired: true,
          message:
            "Your 7-day Free Trial has expired. Please upgrade to a paid subscription plan to continue managing your pharmacy.",
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
    const trialDaysRemaining = isTrial ? getTrialRemainingDays(activeSub.endDate) : undefined;
    (req as any).subscription = activeSub;
    (req as any).tenant = tenant;
    (req as any).isTrial = isTrial;
    (req as any).trialDaysRemaining = trialDaysRemaining;

    next();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to verify subscription" });
  }
};

export const requireTier = (minTier: "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE") => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (req.user.role === "SUPER_ADMIN") {
        next();
        return;
      }

      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: req.user.tenantId },
      });

      if (!tenant) {
        res.status(404).json({ success: false, message: "Tenant not found" });
        return;
      }

      const currentTierLevel = TIER_ORDER[tenant.tier] || 0;
      const requiredTierLevel = TIER_ORDER[minTier] || 0;

      if (currentTierLevel < requiredTierLevel) {
        res.status(403).json({
          success: false,
          message: `This feature requires a ${minTier} plan or higher. Your current plan is ${tenant.tier}. Please upgrade your subscription.`,
          currentTier: tenant.tier,
          requiredTier: minTier,
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to check tier permissions" });
    }
  };
};

export const checkBranchLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (req.user.role === "SUPER_ADMIN") {
      next();
      return;
    }

    const check = await checkCanAddBranch(req.user.tenantId);
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to check branch limits" });
  }
};

export const checkStaffLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (req.user.role === "SUPER_ADMIN") {
      next();
      return;
    }

    const targetBranchId = req.body?.branchId || null;
    const check = await checkCanAddStaff(req.user.tenantId, targetBranchId);

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to check staff limits" });
  }
};
