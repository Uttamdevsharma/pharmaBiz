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
    }
    catch (error) {
        console.error("[Seed Error] Failed to seed Super Admin / Settings:", error.message);
    }
}
