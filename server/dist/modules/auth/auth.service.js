"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../app/lib/prisma");
const planLimits_1 = require("../../app/lib/planLimits");
const product_service_1 = require("../product/product.service");
class AuthService {
    /**
     * Log in via username or email
     */
    static async login(data) {
        const identifier = data.username || data.email;
        if (!identifier) {
            throw new Error("Username or email is required");
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier },
                ],
            },
        });
        if (!user) {
            throw new Error("Invalid username/email or password");
        }
        if (!user.isActive) {
            throw new Error("Your account has been deactivated. Please contact support.");
        }
        const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Invalid username/email or password");
        }
        const payload = {
            id: user.id,
            tenantId: user.tenantId,
            branchId: user.branchId,
            role: user.role,
            username: user.username,
            name: user.name,
            email: user.email,
        };
        const secret = process.env.JWT_SECRET || "default_secret";
        const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
        return {
            token,
            user: payload,
        };
    }
    /**
     * Register Pharmacy Owner, Tenant, Main Branch, and automatically start 7-Day Free Trial
     */
    static async registerOwner(data) {
        // 1. Check if email already registered
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.email },
                ],
            },
        });
        if (existingUser) {
            throw new Error("An account with this email address already exists. Please login instead.");
        }
        // 2. Resolve subscription plan (default to Plan 0 - Free Trial)
        let plan = null;
        if (data.planId) {
            plan = await prisma_1.prisma.subscriptionPlan.findUnique({
                where: { id: data.planId },
            });
        }
        if (!plan) {
            plan = await prisma_1.prisma.subscriptionPlan.findFirst({
                where: { tier: "TRIAL", isActive: true },
            });
        }
        if (!plan) {
            const trialDef = planLimits_1.CENTRAL_PLAN_DEFINITIONS.TRIAL;
            plan = await prisma_1.prisma.subscriptionPlan.create({
                data: {
                    name: trialDef.name,
                    tier: trialDef.tier,
                    price: trialDef.price,
                    billingCycle: trialDef.billingCycle,
                    maxBranches: trialDef.maxBranches,
                    features: trialDef.features,
                    isActive: true,
                },
            });
        }
        const isTrial = plan.tier === "TRIAL";
        const subscriptionStatus = isTrial ? "ACTIVE" : "PENDING";
        const durationDays = isTrial ? 7 : data.billingCycle === "YEARLY" ? 365 : 30;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Create Tenant with Plan Tier (defaults to TRIAL)
            const tenant = await tx.tenant.create({
                data: {
                    name: data.companyName,
                    tier: plan.tier,
                    email: data.email,
                    phone: data.phone,
                    address: data.address || "Main HQ",
                    isActive: true,
                },
            });
            // Create Main Branch
            const mainBranch = await tx.branch.create({
                data: {
                    tenantId: tenant.id,
                    name: "Main Branch",
                    phone: data.phone,
                    location: data.address || "HQ Location",
                    isActive: true,
                },
            });
            // Create Owner User
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    branchId: mainBranch.id,
                    username: data.email,
                    email: data.email,
                    name: data.ownerName,
                    phone: data.phone,
                    role: "COMPANY_OWNER",
                    passwordHash,
                    isActive: true,
                },
            });
            // Create Subscription (ACTIVE automatically for Free Trial!)
            const subscription = await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: plan.id,
                    status: subscriptionStatus,
                    startDate,
                    endDate,
                    autoRenew: false,
                },
                include: {
                    plan: true,
                },
            });
            return { tenant, user, mainBranch, subscription };
        });
        // 4. Seed default 5 Main Categories, Subcategories, and Units
        product_service_1.ProductService.seedDefaultCatalogVariants(result.tenant.id).catch((err) => {
            console.error("[registerOwner] Error seeding default catalog variants:", err);
        });
        // 5. Generate JWT token
        const payload = {
            id: result.user.id,
            tenantId: result.tenant.id,
            branchId: result.mainBranch.id,
            role: result.user.role,
            username: result.user.username,
            name: result.user.name,
            email: result.user.email,
        };
        const secret = process.env.JWT_SECRET || "default_secret";
        const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
        return {
            token,
            user: payload,
            tenant: result.tenant,
            branch: result.mainBranch,
            subscription: result.subscription,
            plan,
            isTrial,
            trialDaysRemaining: isTrial ? 7 : undefined,
        };
    }
}
exports.AuthService = AuthService;
