"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = seedSuperAdmin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("./prisma");
const settings_service_1 = require("../../modules/settings/settings.service");
const planLimits_1 = require("./planLimits");
async function seedSuperAdmin() {
    try {
        const adminEmail = "admin@gmail.com";
        const adminPassword = "admin1234";
        // 1. Seed Platform Settings if not present
        const existingSettings = await prisma_1.prisma.platformSetting.findUnique({
            where: { key: "landing_page_config" },
        });
        if (!existingSettings) {
            await prisma_1.prisma.platformSetting.create({
                data: {
                    key: "landing_page_config",
                    value: settings_service_1.DEFAULT_SETTINGS,
                },
            });
            console.log("[Seed] Platform Landing Page and Theme Settings seeded.");
        }
        // 2. Check if Super Admin already exists
        const existingAdmin = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: adminEmail },
                    { username: adminEmail },
                    { role: "SUPER_ADMIN" },
                ],
            },
        });
        if (!existingAdmin) {
            // 3. Find or create Platform HQ System Tenant for Super Admin
            let systemTenant = await prisma_1.prisma.tenant.findFirst({
                where: { name: "Platform HQ" },
            });
            if (!systemTenant) {
                systemTenant = await prisma_1.prisma.tenant.create({
                    data: {
                        name: "Platform HQ",
                        tier: "ENTERPRISE",
                        email: adminEmail,
                        phone: "01700000000",
                        address: "Dhaka, Bangladesh",
                        isActive: true,
                    },
                });
                console.log("[Seed] Created Platform HQ system tenant.");
            }
            // 4. Hash password and create Super Admin user
            const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
            const superAdmin = await prisma_1.prisma.user.create({
                data: {
                    tenantId: systemTenant.id,
                    username: adminEmail,
                    email: adminEmail,
                    name: "Platform Super Admin",
                    role: "SUPER_ADMIN",
                    passwordHash,
                    isActive: true,
                },
            });
            console.log(`[Seed] Super Admin successfully seeded!`);
            console.log(`-----------------------------------------------`);
            console.log(` Email / Username : ${superAdmin.email}`);
            console.log(` Password         : ${adminPassword}`);
            console.log(` Role             : ${superAdmin.role}`);
            console.log(`-----------------------------------------------`);
        }
        // 5. Seed / Upsert all 4 subscription plans: Plan 0 (Free Trial), Plan 1 (Starter), Plan 2 (Growth), Plan 3 (Enterprise)
        const tiers = ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"];
        for (const tier of tiers) {
            const planDef = planLimits_1.CENTRAL_PLAN_DEFINITIONS[tier];
            const existingPlan = await prisma_1.prisma.subscriptionPlan.findUnique({
                where: { tier },
            });
            if (!existingPlan) {
                await prisma_1.prisma.subscriptionPlan.create({
                    data: {
                        name: planDef.name,
                        tier: planDef.tier,
                        price: planDef.price,
                        billingCycle: planDef.billingCycle,
                        maxBranches: planDef.maxBranches,
                        features: planDef.features,
                        isActive: true,
                    },
                });
                console.log(`[Seed] Created ${planDef.name} (${tier}).`);
            }
            else {
                // Update limits & features in case they were updated
                await prisma_1.prisma.subscriptionPlan.update({
                    where: { tier },
                    data: {
                        name: planDef.name,
                        price: planDef.price,
                        maxBranches: planDef.maxBranches,
                        features: planDef.features,
                        isActive: true,
                    },
                });
            }
        }
        console.log("[Seed] All 4 subscription plans (Plan 0 Free Trial, Plan 1, Plan 2, Plan 3) verified.");
        // 6. Ensure PlatformRole table and seed default dynamic roles
        try {
            await prisma_1.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PlatformRole" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "description" TEXT,
          "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "isSystem" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='customRoleId') THEN
            ALTER TABLE "User" ADD COLUMN "customRoleId" TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='customRoleName') THEN
            ALTER TABLE "User" ADD COLUMN "customRoleName" TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='permissions') THEN
            ALTER TABLE "User" ADD COLUMN "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
          END IF;
        END $$;
      `);
            const defaultRoles = [
                {
                    name: "CTO",
                    description: "Chief Technology Officer - Full platform telemetry, tenant management, plans, payments, and system controls.",
                    permissions: [
                        "pharmacies.manage",
                        "subscriptions.manage",
                        "plans.manage",
                        "payments.view",
                        "reports.view",
                        "staff.create",
                        "staff.manage",
                        "roles.manage",
                        "settings.manage",
                        "platform.data",
                    ],
                    isSystem: false,
                },
                {
                    name: "Project Manager",
                    description: "Platform Operations - Pharmacy onboarding, subscription management, plan modifications, payments, and reports.",
                    permissions: [
                        "pharmacies.manage",
                        "subscriptions.manage",
                        "plans.manage",
                        "payments.view",
                        "reports.view",
                    ],
                    isSystem: false,
                },
                {
                    name: "Support Lead",
                    description: "Customer Support & Success - Managing pharmacies, inspecting subscriptions, and verifying payments.",
                    permissions: [
                        "pharmacies.manage",
                        "subscriptions.manage",
                        "payments.view",
                    ],
                    isSystem: false,
                },
                {
                    name: "Financial Auditor",
                    description: "Financial Oversight - Payment transaction inspection and revenue analytics reports.",
                    permissions: [
                        "payments.view",
                        "reports.view",
                    ],
                    isSystem: false,
                },
            ];
            for (const roleDef of defaultRoles) {
                const existing = await prisma_1.prisma.platformRole.findUnique({
                    where: { name: roleDef.name },
                });
                if (!existing) {
                    await prisma_1.prisma.platformRole.create({
                        data: {
                            id: roleDef.name.toLowerCase().replace(/\s+/g, "-"),
                            name: roleDef.name,
                            description: roleDef.description,
                            permissions: roleDef.permissions,
                            isSystem: roleDef.isSystem,
                        },
                    });
                    console.log(`[Seed] Created dynamic role: ${roleDef.name}`);
                }
            }
        }
        catch (err) {
            console.error("[Seed Error] Failed to ensure dynamic roles:", err.message);
        }
    }
    catch (error) {
        console.error("[Seed Error] Failed to seed Super Admin / Settings:", error.message);
    }
}
