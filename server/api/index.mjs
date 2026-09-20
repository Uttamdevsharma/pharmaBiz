var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/app.ts
import "dotenv/config";
import express from "express";

// src/app/lib/seedAdmin.ts
import bcrypt from "bcryptjs";

// src/app/lib/prisma.ts
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
var connectionString = `${process.env.DATABASE_URL}`;
var pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 1e4,
    timeout: 2e4
  }
});

// src/modules/settings/settings.service.ts
var SETTINGS_KEY = "landing_page_config";
var DEFAULT_SETTINGS = {
  siteName: "PharmaBiz SaaS",
  logoUrl: "",
  logoPublicId: "",
  primaryColor: "#059669",
  // Emerald Green default
  hero: {
    badge: "Next-Gen Multi-Tenant Pharmacy Platform",
    title: "Empower Your Pharmacy Chain With Smart Offline-First SaaS",
    subtitle: "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime even when the internet is disconnected.",
    ctaPrimaryText: "Get Started Now",
    ctaSecondaryText: "Explore Plans"
  },
  features: [
    {
      id: "offline-pos",
      title: "Offline-First POS",
      description: "Counter sales never stop. Keep dispensing medicines offline with automatic cloud synchronization upon reconnection.",
      icon: "Zap"
    },
    {
      id: "multi-branch",
      title: "Multi-Branch & Region Control",
      description: "Manage multiple branch locations, assign regional managers, and track company-wide performance from a single dashboard.",
      icon: "Building2"
    },
    {
      id: "inventory-expiry",
      title: "Inventory & Expiry Tracking",
      description: "Automated low-stock warnings, near-expiry alerts, batch tracking, and audit trails for maximum patient safety.",
      icon: "ShieldAlert"
    },
    {
      id: "inter-branch",
      title: "Inter-Branch Stock Transfers",
      description: "Seamless stock movement requests with regional admin approvals and atomic ledger adjustments across branches.",
      icon: "ArrowLeftRight"
    },
    {
      id: "tiered-rbac",
      title: "Granular RBAC Security",
      description: "Role-based access control protecting prescription drugs, voiding sales, and compliance audits both online and offline.",
      icon: "ShieldCheck"
    },
    {
      id: "sslcommerz",
      title: "Instant Subscription Payments",
      description: "Integrated SSLCOMMERZ gateway for instant card/mobile banking subscription renewals and plan upgrades.",
      icon: "CreditCard"
    }
  ],
  howItWorks: [
    {
      step: 1,
      title: "Choose Your Plan & Sign Up",
      description: "Select the Starter, Growth, or Enterprise plan matching your branch scale and complete secure payment."
    },
    {
      step: 2,
      title: "Set Up Branches & Staff",
      description: "Add your store branches, assign branch managers, cashiers, and configure your central drug catalog."
    },
    {
      step: 3,
      title: "Start Selling Anywhere",
      description: "Launch the POS at counter tablets or desktops and sell seamlessly with full offline capability and automated cloud sync."
    }
  ],
  contact: {
    email: "shameem.rml@gmail.com",
    phone: "01973590937",
    address: "Gulshan-2, Dhaka-1212, Bangladesh",
    supportHours: "24/7 Dedicated Support"
  },
  about: {
    headline: "Built for Modern Pharmacy Enterprises",
    description: "PharmaBiz provides a complete operating system for retail pharmacies and hospital chains, offering bulletproof reliability and multi-tenant data isolation.",
    stats: [
      { label: "Uptime Guaranteed", value: "99.99%" },
      { label: "Offline Resilience", value: "72+ Hours" },
      { label: "POS Transaction Speed", value: "< 1 Sec" },
      { label: "Pharmacies Powered", value: "500+" }
    ]
  }
};
var SettingsService = class {
  /**
   * Get public landing page content and theme configuration
   */
  static async getPublicSettings() {
    let setting = await prisma.platformSetting.findUnique({
      where: { key: SETTINGS_KEY }
    });
    let config = setting ? setting.value : DEFAULT_SETTINGS;
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    });
    return {
      ...config,
      plans
    };
  }
  /**
   * Get raw platform settings for Super Admin
   */
  static async getAdminSettings() {
    let setting = await prisma.platformSetting.findUnique({
      where: { key: SETTINGS_KEY }
    });
    return setting ? setting.value : DEFAULT_SETTINGS;
  }
  /**
   * Update platform settings from Super Admin
   */
  static async updateSettings(data) {
    const current = await this.getAdminSettings();
    const merged = {
      ...current,
      ...data.siteName !== void 0 && { siteName: data.siteName },
      ...data.logoUrl !== void 0 && { logoUrl: data.logoUrl },
      ...data.logoPublicId !== void 0 && { logoPublicId: data.logoPublicId },
      ...data.primaryColor !== void 0 && { primaryColor: data.primaryColor },
      ...data.hero && { hero: { ...current.hero, ...data.hero } },
      ...data.features && { features: data.features },
      ...data.howItWorks && { howItWorks: data.howItWorks },
      ...data.contact && { contact: { ...current.contact, ...data.contact } },
      ...data.about && { about: { ...current.about, ...data.about } }
    };
    const saved = await prisma.platformSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: merged },
      create: {
        key: SETTINGS_KEY,
        value: merged
      }
    });
    return saved.value;
  }
  /**
   * Get tenant-specific VAT & Tax configuration
   */
  static async getTenantVatSettings(tenantId) {
    const key = `vat_settings_${tenantId}`;
    const setting = await prisma.platformSetting.findUnique({
      where: { key }
    });
    if (!setting) {
      return {
        vatPercent: 0,
        isVatEnabled: false,
        vatNumber: "",
        taxType: "EXCLUSIVE"
      };
    }
    return setting.value;
  }
  /**
   * Update tenant-specific VAT & Tax configuration
   */
  static async updateTenantVatSettings(tenantId, userId, data) {
    const key = `vat_settings_${tenantId}`;
    const vatPercent = typeof data.vatPercent === "number" ? Math.max(0, data.vatPercent) : Number(data.vatPercent) || 0;
    const isVatEnabled = Boolean(data.isVatEnabled);
    const vatNumber = typeof data.vatNumber === "string" ? data.vatNumber.trim() : "";
    const taxType = data.taxType === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
    const value = {
      vatPercent,
      isVatEnabled,
      vatNumber,
      taxType,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: userId
    };
    const setting = await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    });
    return setting.value;
  }
  /**
   * Get pharmacy-specific UI/invoice settings (per-tenant, separate from SaaS branding)
   */
  static async getPharmacySettings(tenantId) {
    const key = `pharmacy_settings_${tenantId}`;
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    if (!setting) {
      return {
        receiptHeaderNote: "Thank you for shopping with us. Get well soon!",
        receiptFooterNote: "Items can be returned within 48 hours with original invoice and valid prescription.",
        prescriptionRequiredMessage: "\u26A0\uFE0F This product requires a valid doctor's prescription. Please provide the prescription reference number or doctor's name before completing the purchase."
      };
    }
    return setting.value;
  }
  /**
   * Update pharmacy-specific UI/invoice settings (per-tenant)
   */
  static async updatePharmacySettings(tenantId, userId, data) {
    const key = `pharmacy_settings_${tenantId}`;
    const current = await this.getPharmacySettings(tenantId);
    const value = {
      ...current,
      ...data.receiptHeaderNote !== void 0 && { receiptHeaderNote: String(data.receiptHeaderNote).trim() },
      ...data.receiptFooterNote !== void 0 && { receiptFooterNote: String(data.receiptFooterNote).trim() },
      ...data.prescriptionRequiredMessage !== void 0 && {
        prescriptionRequiredMessage: String(data.prescriptionRequiredMessage).trim()
      },
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: userId
    };
    const setting = await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    });
    return setting.value;
  }
};

// src/app/lib/planLimits.ts
var CENTRAL_PLAN_DEFINITIONS = {
  TRIAL: {
    tier: "TRIAL",
    name: "Plan 0 - Free Trial",
    price: 0,
    billingCycle: "MONTHLY",
    trialDays: 7,
    maxBranches: 1,
    maxStaffPerBranch: 1,
    maxTotalStaff: 1,
    features: {
      branches: "1 Branch (Main Branch Only)",
      staff: "1 Staff Member",
      inventoryTransfers: false,
      regionalAdmin: false,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: false,
      auditReports: "Basic Audit Trail (7-Day Trial)"
    }
  },
  STARTER: {
    tier: "STARTER",
    name: "Plan 1 - Starter",
    price: 500,
    billingCycle: "MONTHLY",
    maxBranches: 2,
    maxStaffPerBranch: 1,
    maxTotalStaff: 2,
    features: {
      branches: "Max 2 Branches (Main + 1)",
      staff: "1 Staff per Branch",
      inventoryTransfers: false,
      regionalAdmin: false,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: false,
      auditReports: "Basic Audit Trail"
    }
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Plan 2 - Growth",
    price: 1500,
    billingCycle: "MONTHLY",
    maxBranches: 3,
    maxStaffPerBranch: 3,
    maxTotalStaff: 9,
    features: {
      branches: "Max 3 Branches",
      staff: "3 Staff per Branch",
      inventoryTransfers: true,
      regionalAdmin: true,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: true,
      auditReports: "Standard Reports & Inter-Branch Transfers"
    }
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Plan 3 - Enterprise",
    price: 3e3,
    billingCycle: "MONTHLY",
    maxBranches: 999,
    maxStaffPerBranch: 999,
    maxTotalStaff: 999,
    features: {
      branches: "Unlimited Branches",
      staff: "Unlimited Staff",
      inventoryTransfers: true,
      regionalAdmin: true,
      customAudit: true,
      apiAccess: true,
      branchPriceOverride: true,
      auditReports: "Custom & VAT/MIS Compliance Export"
    }
  }
};
function getPlanConfig(tier) {
  const normalizedTier = (tier || "TRIAL").toUpperCase();
  return CENTRAL_PLAN_DEFINITIONS[normalizedTier] || CENTRAL_PLAN_DEFINITIONS.TRIAL;
}
function getTrialRemainingDays(endDate) {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
}
function isSubscriptionExpired(subscription) {
  if (!subscription) return true;
  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") return true;
  if (!subscription.endDate) return false;
  return new Date(subscription.endDate).getTime() <= Date.now();
}
async function checkCanAddBranch(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: { where: { isActive: true } },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!tenant) {
    return { allowed: false, currentBranches: 0, maxBranches: 0, message: "Tenant not found" };
  }
  const activeSub = tenant.subscriptions && tenant.subscriptions[0];
  const tier = activeSub?.plan?.tier || tenant.tier || "TRIAL";
  const planConfig = getPlanConfig(tier);
  const maxBranches = activeSub?.plan?.maxBranches || planConfig.maxBranches;
  const currentBranches = tenant.branches ? tenant.branches.length : 0;
  if (currentBranches >= maxBranches) {
    return {
      allowed: false,
      currentBranches,
      maxBranches,
      message: `Branch limit reached (${currentBranches}/${maxBranches}). Your ${planConfig.name} allows at most ${maxBranches >= 999 ? "Unlimited" : maxBranches} branch(es). Please upgrade your subscription to add more branches.`
    };
  }
  return { allowed: true, currentBranches, maxBranches };
}
async function checkCanAddStaff(tenantId, branchId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: { where: { isActive: true } },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!tenant) {
    return { allowed: false, currentStaff: 0, maxStaff: 0, message: "Tenant not found" };
  }
  const activeSub = tenant.subscriptions && tenant.subscriptions[0];
  const tier = activeSub?.plan?.tier || tenant.tier || "TRIAL";
  const planConfig = getPlanConfig(tier);
  const nonOwnerUsers = (tenant.users || []).filter((u) => u.role !== "COMPANY_OWNER");
  const totalStaffCount = nonOwnerUsers.length;
  if (tier === "TRIAL") {
    if (totalStaffCount >= 1) {
      return {
        allowed: false,
        currentStaff: totalStaffCount,
        maxStaff: 1,
        message: `Staff limit reached (1/1 staff on ${planConfig.name}). Plan 0 - Free Trial allows a maximum of 1 staff member. Please upgrade to a paid plan to add more staff.`
      };
    }
    return { allowed: true, currentStaff: totalStaffCount, maxStaff: 1 };
  }
  if (branchId && planConfig.maxStaffPerBranch < 999) {
    const branchStaff = nonOwnerUsers.filter((u) => u.branchId === branchId);
    if (branchStaff.length >= planConfig.maxStaffPerBranch) {
      return {
        allowed: false,
        currentStaff: branchStaff.length,
        maxStaff: planConfig.maxStaffPerBranch,
        message: `Branch staff limit reached (${branchStaff.length}/${planConfig.maxStaffPerBranch} for this branch on ${planConfig.name}). Please upgrade your plan to assign more staff to this branch.`
      };
    }
  }
  return {
    allowed: true,
    currentStaff: totalStaffCount,
    maxStaff: planConfig.maxTotalStaff || 999
  };
}

// src/app/lib/seedAdmin.ts
async function seedSuperAdmin() {
  try {
    const adminEmail = "admin@gmail.com";
    const adminPassword = "admin1234";
    const existingSettings = await prisma.platformSetting.findUnique({
      where: { key: "landing_page_config" }
    });
    if (!existingSettings) {
      await prisma.platformSetting.create({
        data: {
          key: "landing_page_config",
          value: DEFAULT_SETTINGS
        }
      });
      console.log("[Seed] Platform Landing Page and Theme Settings seeded.");
    }
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username: adminEmail },
          { role: "SUPER_ADMIN" }
        ]
      }
    });
    if (!existingAdmin) {
      let systemTenant = await prisma.tenant.findFirst({
        where: { name: "Platform HQ" }
      });
      if (!systemTenant) {
        systemTenant = await prisma.tenant.create({
          data: {
            name: "Platform HQ",
            tier: "ENTERPRISE",
            email: adminEmail,
            phone: "01700000000",
            address: "Dhaka, Bangladesh",
            isActive: true
          }
        });
        console.log("[Seed] Created Platform HQ system tenant.");
      }
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const superAdmin = await prisma.user.create({
        data: {
          tenantId: systemTenant.id,
          username: adminEmail,
          email: adminEmail,
          name: "Platform Super Admin",
          role: "SUPER_ADMIN",
          passwordHash,
          isActive: true
        }
      });
      console.log(`[Seed] Super Admin successfully seeded!`);
      console.log(`-----------------------------------------------`);
      console.log(` Email / Username : ${superAdmin.email}`);
      console.log(` Password         : ${adminPassword}`);
      console.log(` Role             : ${superAdmin.role}`);
      console.log(`-----------------------------------------------`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash, isActive: true }
      });
    }
    let demoTenant = await prisma.tenant.findFirst({
      where: { email: "uttam23412@gmail.com" }
    });
    if (!demoTenant) {
      demoTenant = await prisma.tenant.findFirst({
        where: { name: "Demo Pharmacy" }
      });
    }
    if (!demoTenant) {
      demoTenant = await prisma.tenant.create({
        data: {
          name: "Demo Pharmacy",
          tier: "ENTERPRISE",
          email: "uttam23412@gmail.com",
          phone: "01711112233",
          address: "Gulshan, Dhaka, Bangladesh",
          isActive: true,
          verificationStatus: "ACTIVE"
        }
      });
      console.log("[Seed] Created Demo Pharmacy tenant.");
    } else {
      await prisma.tenant.update({
        where: { id: demoTenant.id },
        data: { isActive: true, verificationStatus: "ACTIVE" }
      });
    }
    let demoBranch = await prisma.branch.findFirst({
      where: { tenantId: demoTenant.id }
    });
    if (!demoBranch) {
      demoBranch = await prisma.branch.create({
        data: {
          tenantId: demoTenant.id,
          name: "Main Branch",
          phone: "01711112233",
          location: "Gulshan, Dhaka",
          isActive: true
        }
      });
      console.log("[Seed] Created Main Branch for Demo Pharmacy.");
    }
    const demoUsers = [
      {
        email: "uttam23412@gmail.com",
        username: "uttam23412@gmail.com",
        password: "uttam1234",
        name: "Uttam Sharma",
        role: "COMPANY_OWNER",
        tenantId: demoTenant.id,
        branchId: demoBranch.id
      },
      {
        email: "akash@gmail.com",
        username: "akash@gmail.com",
        password: "akash1234",
        name: "Akash Rahman",
        role: "BRANCH_MANAGER",
        tenantId: demoTenant.id,
        branchId: demoBranch.id
      },
      {
        email: "reday@gmail.com",
        username: "reday@gmail.com",
        password: "reday1234",
        name: "Reday Ahmed",
        role: "CASHIER",
        tenantId: demoTenant.id,
        branchId: demoBranch.id
      },
      {
        email: "alif@gmail.com",
        username: "alif@gmail.com",
        password: "alif1234",
        name: "Alif Hossain",
        role: "INVENTORY_EXECUTIVE",
        tenantId: demoTenant.id,
        branchId: demoBranch.id
      }
    ];
    for (const dUser of demoUsers) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: dUser.email },
            { username: dUser.username }
          ]
        }
      });
      const passwordHash = await bcrypt.hash(dUser.password, 10);
      if (!existing) {
        await prisma.user.create({
          data: {
            tenantId: dUser.tenantId,
            branchId: dUser.branchId,
            username: dUser.username,
            email: dUser.email,
            name: dUser.name,
            role: dUser.role,
            passwordHash,
            isActive: true
          }
        });
        console.log(`[Seed] Demo account created: ${dUser.email} (${dUser.role})`);
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            isActive: true,
            role: dUser.role
          }
        });
      }
    }
    const tiers = ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"];
    for (const tier of tiers) {
      const planDef = CENTRAL_PLAN_DEFINITIONS[tier];
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { tier }
      });
      if (!existingPlan) {
        await prisma.subscriptionPlan.create({
          data: {
            name: planDef.name,
            tier: planDef.tier,
            price: planDef.price,
            billingCycle: planDef.billingCycle,
            maxBranches: planDef.maxBranches,
            features: planDef.features,
            isActive: true
          }
        });
        console.log(`[Seed] Created ${planDef.name} (${tier}).`);
      } else {
        await prisma.subscriptionPlan.update({
          where: { tier },
          data: {
            name: planDef.name,
            price: planDef.price,
            maxBranches: planDef.maxBranches,
            features: planDef.features,
            isActive: true
          }
        });
      }
    }
    console.log("[Seed] All 4 subscription plans (Plan 0 Free Trial, Plan 1, Plan 2, Plan 3) verified.");
    try {
      await prisma.$executeRawUnsafe(`
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
            "platform.data"
          ],
          isSystem: false
        },
        {
          name: "Project Manager",
          description: "Platform Operations - Pharmacy onboarding, subscription management, plan modifications, payments, and reports.",
          permissions: [
            "pharmacies.manage",
            "subscriptions.manage",
            "plans.manage",
            "payments.view",
            "reports.view"
          ],
          isSystem: false
        },
        {
          name: "Support Lead",
          description: "Customer Support & Success - Managing pharmacies, inspecting subscriptions, and verifying payments.",
          permissions: [
            "pharmacies.manage",
            "subscriptions.manage",
            "payments.view"
          ],
          isSystem: false
        },
        {
          name: "Financial Auditor",
          description: "Financial Oversight - Payment transaction inspection and revenue analytics reports.",
          permissions: [
            "payments.view",
            "reports.view"
          ],
          isSystem: false
        }
      ];
      for (const roleDef of defaultRoles) {
        const existing = await prisma.platformRole.findUnique({
          where: { name: roleDef.name }
        });
        if (!existing) {
          await prisma.platformRole.create({
            data: {
              id: roleDef.name.toLowerCase().replace(/\s+/g, "-"),
              name: roleDef.name,
              description: roleDef.description,
              permissions: roleDef.permissions,
              isSystem: roleDef.isSystem
            }
          });
          console.log(`[Seed] Created dynamic role: ${roleDef.name}`);
        }
      }
    } catch (err) {
      console.error("[Seed Error] Failed to ensure dynamic roles:", err.message);
    }
  } catch (error) {
    console.error("[Seed Error] Failed to seed Super Admin / Settings:", error.message);
  }
}

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/modules/auth/auth.validation.ts
import { z } from "zod";
var loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters")
}).refine((data) => data.username || data.email, {
  message: "Either username or email is required",
  path: ["username"]
});
var registerOwnerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number must be at least 5 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
  // Regulatory document & license numbers
  nidNumber: z.string().min(4, "NID number is required"),
  nidFrontDocument: z.string().min(1, "NID front document is required").optional(),
  nidBackDocument: z.string().min(1, "NID back document is required").optional(),
  nidDocument: z.string().optional(),
  // Fallback / single doc support
  tradeLicenseNumber: z.string().min(4, "Trade license number is required"),
  tradeLicenseFrontDocument: z.string().min(1, "Trade license front document is required").optional(),
  tradeLicenseBackDocument: z.string().optional(),
  tradeLicenseDocument: z.string().optional(),
  drugLicenseNumber: z.string().min(4, "Drug license number is required"),
  drugLicenseFrontDocument: z.string().min(1, "Drug license front document is required").optional(),
  drugLicenseBackDocument: z.string().optional(),
  drugLicenseDocument: z.string().optional(),
  planId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY")
});
var verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  tenantId: z.string().optional(),
  otpCode: z.string().min(4, "OTP code must be at least 4-6 digits")
});
var resendOtpSchema = z.object({
  email: z.string().email("Invalid email address")
});

// src/modules/auth/auth.service.ts
import bcrypt2 from "bcryptjs";
import jwt from "jsonwebtoken";

// src/app/lib/audit.ts
var AuditService = class {
  static async log(params) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          branchId: params.branchId || null,
          userId: params.userId || null,
          action: params.action,
          details: params.details ? params.details : void 0,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null
        }
      });
    } catch (error) {
      console.error("[AuditService] Failed to record audit log:", error);
    }
  }
};

// src/modules/product/product.service.ts
function mapCategoryNameToProductType(categoryName) {
  if (!categoryName) return "MEDICINE";
  const lower = categoryName.toLowerCase();
  if (lower.includes("syrup") || lower.includes("liquid") || lower.includes("suspension") || lower.includes("drop")) return "SYRUP";
  if (lower.includes("equipment") || lower.includes("device") || lower.includes("monitor") || lower.includes("surgical") || lower.includes("disposable")) return "EQUIPMENT";
  if (lower.includes("saline") || lower.includes("fluid") || lower.includes("infusion") || lower.includes("iv")) return "SALINE";
  if (lower.includes("other") || lower.includes("care") || lower.includes("hygiene") || lower.includes("baby") || lower.includes("supplement") || lower.includes("general")) return "OTHER";
  return "MEDICINE";
}
var ProductService = class {
  /**
   * Seed default Units for a Tenant
   */
  static async seedDefaultCatalogVariants(tenantId) {
    const defaultUnits = [
      { name: "Tablet", symbol: "tab", productType: "MEDICINE" },
      { name: "Strip", symbol: "strip", productType: "MEDICINE" },
      { name: "Box", symbol: "box", productType: "MEDICINE" },
      { name: "Capsule", symbol: "cap", productType: "MEDICINE" },
      { name: "Milligram", symbol: "mg", productType: "MEDICINE" },
      { name: "Milliliter", symbol: "ml", productType: "SYRUP" },
      { name: "Bottle", symbol: "bottle", productType: "SYRUP" },
      { name: "Piece", symbol: "pcs", productType: "EQUIPMENT" },
      { name: "Bag", symbol: "bag", productType: "SALINE" },
      { name: "Vial", symbol: "vial", productType: "MEDICINE" },
      { name: "Pack", symbol: "pack", productType: "OTHER" },
      { name: "Tin", symbol: "tin", productType: "OTHER" },
      { name: "Tube", symbol: "tube", productType: "MEDICINE" }
    ];
    for (const unit of defaultUnits) {
      const existingUnit = await prisma.unit.findFirst({
        where: { tenantId, name: unit.name }
      });
      if (!existingUnit) {
        await prisma.unit.create({
          data: { tenantId, ...unit }
        });
      }
    }
  }
  /**
   * Automatically reconcile legacy category references on products if needed
   */
  static async reconcileLegacyCategories(tenantId) {
    try {
      const products = await prisma.product.findMany({
        where: { tenantId },
        include: { categoryRef: true, subcategoryRef: true }
      });
      for (const prod of products) {
        let mainCatId = prod.categoryId;
        let mainCatName = prod.category;
        let subCatId = prod.subcategoryId;
        let subCatName = prod.subcategory;
        let needsUpdate = false;
        if (prod.categoryRef && prod.categoryRef.parentId) {
          subCatId = prod.categoryRef.id;
          subCatName = prod.categoryRef.name;
          const parent = await prisma.category.findUnique({
            where: { id: prod.categoryRef.parentId }
          });
          if (parent) {
            mainCatId = parent.id;
            mainCatName = parent.name;
          }
          needsUpdate = true;
        }
        if (needsUpdate) {
          await prisma.product.update({
            where: { id: prod.id },
            data: {
              categoryId: mainCatId || null,
              category: mainCatName || null,
              subcategoryId: subCatId || null,
              subcategory: subCatName || null
            }
          });
        }
      }
    } catch (err) {
      console.error("[reconcileLegacyCategories] Error:", err);
    }
  }
  // ==================== CATEGORIES ====================
  static async listCategories(tenantId) {
    return prisma.category.findMany({
      where: { tenantId, parentId: null },
      include: {
        subcategories: {
          orderBy: { name: "asc" },
          include: {
            _count: { select: { subProducts: true } }
          }
        },
        _count: { select: { products: true, subcategories: true } }
      },
      orderBy: { name: "asc" }
    });
  }
  static async createCategory(tenantId, userId, data) {
    let parentCategory = null;
    let resolvedProductType = data.productType;
    if (data.parentId) {
      parentCategory = await prisma.category.findFirst({
        where: { id: data.parentId, tenantId }
      });
      if (!parentCategory) {
        throw new Error("Selected Main Category was not found");
      }
      resolvedProductType = parentCategory.productType || mapCategoryNameToProductType(parentCategory.name);
    } else {
      resolvedProductType = resolvedProductType || mapCategoryNameToProductType(data.name);
    }
    const category = await prisma.category.create({
      data: {
        tenantId,
        name: data.name.trim(),
        parentId: data.parentId || null,
        productType: resolvedProductType,
        defaultUnit: data.defaultUnit || parentCategory?.defaultUnit || null,
        description: data.description || null,
        isActive: data.isActive !== void 0 ? data.isActive : true
      },
      include: {
        parent: true
      }
    });
    if (Array.isArray(data.subcategories) && data.subcategories.length > 0 && !data.parentId) {
      for (const subName of data.subcategories) {
        const trimmed = subName.trim();
        if (trimmed) {
          await prisma.category.create({
            data: {
              tenantId,
              name: trimmed,
              parentId: category.id,
              productType: resolvedProductType,
              defaultUnit: category.defaultUnit || null,
              isActive: true
            }
          });
        }
      }
    }
    await AuditService.log({
      tenantId,
      userId,
      action: "CATEGORY_CREATE",
      details: {
        categoryId: category.id,
        name: category.name,
        parentId: category.parentId,
        isSubcategory: Boolean(category.parentId),
        subcategoriesCount: data.subcategories?.length || 0
      }
    });
    return category;
  }
  static async updateCategory(id, tenantId, userId, data) {
    const existing = await prisma.category.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw new Error("Category not found");
    }
    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...data.name && { name: data.name.trim() },
        ...data.parentId !== void 0 && { parentId: data.parentId },
        ...data.productType && { productType: data.productType },
        ...data.defaultUnit !== void 0 && { defaultUnit: data.defaultUnit },
        ...data.description !== void 0 && { description: data.description },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
    if (data.name && data.name.trim() !== existing.name) {
      if (existing.parentId === null) {
        await prisma.product.updateMany({
          where: { categoryId: id },
          data: { category: data.name.trim() }
        });
      } else {
        await prisma.product.updateMany({
          where: { subcategoryId: id },
          data: { subcategory: data.name.trim() }
        });
      }
    }
    await AuditService.log({
      tenantId,
      userId,
      action: "CATEGORY_UPDATE",
      details: { categoryId: id, name: updated.name }
    });
    return updated;
  }
  static async deleteCategory(id, tenantId, userId) {
    const category = await prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        subcategories: {
          include: {
            _count: { select: { subProducts: true } }
          }
        },
        _count: { select: { products: true, subProducts: true, subcategories: true } }
      }
    });
    if (!category) {
      throw new Error("Category not found");
    }
    const directProductsCount = (category._count?.products || 0) + (category._count?.subProducts || 0);
    if (directProductsCount > 0) {
      throw new Error(`Cannot delete "${category.name}" because it currently has ${directProductsCount} product(s) assigned to it. Please reassign or delete these products first.`);
    }
    if (category.subcategories && category.subcategories.length > 0) {
      const subWithProducts = category.subcategories.find((s) => (s._count?.subProducts || 0) > 0);
      if (subWithProducts) {
        throw new Error(`Cannot delete "${category.name}" because subcategory "${subWithProducts.name}" has active products assigned to it. Please reassign them first.`);
      }
      await prisma.category.deleteMany({
        where: { parentId: id }
      });
    }
    await prisma.category.delete({ where: { id } });
    await AuditService.log({
      tenantId,
      userId,
      action: "CATEGORY_DELETE",
      details: { categoryId: id, name: category.name }
    });
    return { message: "Category deleted successfully" };
  }
  // ==================== BRANDS ====================
  static async listBrands(tenantId) {
    return prisma.brand.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } }
    });
  }
  static async createBrand(tenantId, userId, data) {
    const brand = await prisma.brand.create({
      data: {
        tenantId,
        name: data.name.trim(),
        description: data.description || null
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "BRAND_CREATE",
      details: { brandId: brand.id, name: brand.name }
    });
    return brand;
  }
  static async updateBrand(id, tenantId, userId, data) {
    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...data.name && { name: data.name.trim() },
        ...data.description !== void 0 && { description: data.description },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "BRAND_UPDATE",
      details: { brandId: id, name: updated.name }
    });
    return updated;
  }
  static async deleteBrand(id, tenantId, userId) {
    await prisma.brand.delete({ where: { id } });
    await AuditService.log({
      tenantId,
      userId,
      action: "BRAND_DELETE",
      details: { brandId: id }
    });
    return { message: "Brand deleted successfully" };
  }
  // ==================== UNITS ====================
  static async listUnits(tenantId) {
    let units = await prisma.unit.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    });
    if (units.length === 0) {
      await this.seedDefaultCatalogVariants(tenantId);
      units = await prisma.unit.findMany({
        where: { tenantId },
        orderBy: { name: "asc" }
      });
    }
    return units;
  }
  static async createUnit(tenantId, userId, data) {
    const unit = await prisma.unit.create({
      data: {
        tenantId,
        name: data.name.trim(),
        symbol: data.symbol.trim(),
        productType: data.productType || "MEDICINE"
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "UNIT_CREATE",
      details: { unitId: unit.id, symbol: unit.symbol }
    });
    return unit;
  }
  // ==================== PRODUCTS ====================
  static async createProduct(tenantId, userId, data) {
    const sku = data.sku && data.sku.trim() !== "" ? data.sku.trim() : `SKU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const existing = await prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku
        }
      }
    });
    if (existing) {
      throw new Error(`Product with SKU "${sku}" already exists in your catalog`);
    }
    let mainCategoryName = data.category || null;
    let mainCategoryId = data.categoryId || null;
    let subcategoryName = data.subcategory || null;
    let subcategoryId = data.subcategoryId || null;
    if (mainCategoryId) {
      const cat = await prisma.category.findUnique({ where: { id: mainCategoryId } });
      if (cat) {
        if (cat.parentId) {
          subcategoryId = cat.id;
          subcategoryName = cat.name;
          const parent = await prisma.category.findUnique({ where: { id: cat.parentId } });
          if (parent) {
            mainCategoryId = parent.id;
            mainCategoryName = parent.name;
          }
        } else {
          mainCategoryName = cat.name;
        }
      }
    }
    if (subcategoryId && !subcategoryName) {
      const sub = await prisma.category.findUnique({ where: { id: subcategoryId } });
      if (sub) {
        subcategoryName = sub.name;
        if (!mainCategoryId && sub.parentId) {
          mainCategoryId = sub.parentId;
          const parent = await prisma.category.findUnique({ where: { id: sub.parentId } });
          if (parent) mainCategoryName = parent.name;
        }
      }
    }
    if (!mainCategoryName && !mainCategoryId) {
      mainCategoryName = "Medicine";
      const root = await prisma.category.findFirst({
        where: { tenantId, name: "Medicine", parentId: null }
      });
      if (root) mainCategoryId = root.id;
    }
    let brandName = data.brandName || null;
    if (data.brandId && !brandName) {
      const b = await prisma.brand.findUnique({ where: { id: data.brandId } });
      if (b) brandName = b.name;
    }
    const calculatedType = mapCategoryNameToProductType(mainCategoryName);
    const isMed = calculatedType === "MEDICINE";
    const product = await prisma.product.create({
      data: {
        tenantId,
        name: data.name.trim(),
        genericName: data.genericName ? data.genericName.trim() : null,
        sku,
        barcode: data.barcode || null,
        basePrice: data.basePrice ?? 0,
        category: mainCategoryName,
        categoryId: mainCategoryId,
        subcategory: subcategoryName,
        subcategoryId,
        brandId: data.brandId || null,
        unitId: data.unitId || null,
        productType: calculatedType,
        brandName: brandName || data.manufacturer || null,
        manufacturer: data.manufacturer || brandName || null,
        unit: data.unit || (isMed ? "tablet" : "piece"),
        size: data.size || null,
        defaultPackType: data.defaultPackType || (data.unit === "bottle" ? "BOTTLE" : "BOX"),
        qtyPerLevel2: data.qtyPerLevel2 ? Number(data.qtyPerLevel2) : data.unit === "bottle" ? data.stripsPerBox ? Number(data.stripsPerBox) : 12 : 10,
        qtyPerLevel3: data.qtyPerLevel3 ? Number(data.qtyPerLevel3) : null,
        qtyPerLevel4: data.qtyPerLevel4 ? Number(data.qtyPerLevel4) : null,
        stripsPerBox: data.stripsPerBox ? Number(data.stripsPerBox) : 10,
        tabletsPerStrip: data.tabletsPerStrip ? Number(data.tabletsPerStrip) : 10,
        minStockAlert: data.minStockAlert !== void 0 ? data.minStockAlert : 10,
        description: data.description || null,
        isControlled: data.isControlled || false,
        requiresPrescription: data.requiresPrescription || false,
        isActive: true
      },
      include: {
        categoryRef: true,
        subcategoryRef: true,
        brandRef: true,
        unitRef: true
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_CREATE",
      details: {
        productId: product.id,
        name: product.name,
        genericName: product.genericName,
        sku: product.sku,
        category: product.category,
        subcategory: product.subcategory
      }
    });
    return product;
  }
  static async listProducts(tenantId, query) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (query.isActive !== void 0) {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query.category) {
      where.category = { equals: query.category, mode: "insensitive" };
    }
    if (query.subcategoryId) {
      where.subcategoryId = query.subcategoryId;
    } else if (query.subcategory) {
      where.subcategory = { equals: query.subcategory, mode: "insensitive" };
    }
    if (query.brandId) {
      where.brandId = query.brandId;
    }
    if (query.productType) {
      where.productType = query.productType;
    }
    if (query.isControlled !== void 0) {
      where.isControlled = query.isControlled;
    }
    if (query.requiresPrescription !== void 0) {
      where.requiresPrescription = query.requiresPrescription;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { genericName: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        { barcode: { contains: query.search, mode: "insensitive" } },
        { category: { contains: query.search, mode: "insensitive" } },
        { subcategory: { contains: query.search, mode: "insensitive" } },
        { brandName: { contains: query.search, mode: "insensitive" } },
        { manufacturer: { contains: query.search, mode: "insensitive" } }
      ];
    }
    const includeOptions = {
      categoryRef: true,
      subcategoryRef: true,
      brandRef: true,
      unitRef: true
    };
    if (query.branchId) {
      includeOptions.branchOverrides = {
        where: { branchId: query.branchId }
      };
      includeOptions.inventories = {
        where: { branchId: query.branchId, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
        include: {
          locations: {
            include: { rack: true, shelf: true, bin: true }
          }
        }
      };
    } else {
      includeOptions.inventories = {
        where: { quantity: { gt: 0 } },
        include: {
          locations: {
            include: { rack: true, shelf: true, bin: true }
          }
        }
      };
    }
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: includeOptions
      })
    ]);
    const data = products.map((p) => {
      const override = p.branchOverrides && p.branchOverrides[0];
      const totalStock = (p.inventories || []).reduce((acc, inv) => acc + (inv.quantity || 0), 0);
      const latestBatch = p.inventories && p.inventories.length > 0 ? p.inventories[0] : null;
      const batchSellingPrice = latestBatch ? Number(latestBatch.sellingPrice || latestBatch.boxSellingPrice || 0) : 0;
      const computedPrice = override ? Number(override.price) : Number(p.basePrice) > 0 ? Number(p.basePrice) : batchSellingPrice;
      return {
        ...p,
        basePrice: Number(p.basePrice) > 0 ? Number(p.basePrice) : computedPrice,
        effectivePrice: computedPrice,
        hasBranchOverride: !!override,
        currentStock: totalStock,
        batches: p.inventories || []
      };
    });
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async getProductById(productId, tenantId, branchId) {
    const includeOptions = {
      categoryRef: true,
      subcategoryRef: true,
      brandRef: true,
      unitRef: true,
      inventories: {
        where: branchId ? { branchId } : void 0,
        include: {
          branch: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, phone: true } },
          locations: {
            include: { rack: true, shelf: true, bin: true }
          }
        },
        orderBy: { expiryDate: "asc" }
      }
    };
    if (branchId) {
      includeOptions.branchOverrides = { where: { branchId } };
    } else {
      includeOptions.branchOverrides = {
        include: { branch: { select: { id: true, name: true } } }
      };
    }
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: includeOptions
    });
    if (!product) {
      throw new Error("Product not found");
    }
    const override = branchId && product.branchOverrides && product.branchOverrides[0];
    const totalStock = (product.inventories || []).reduce((acc, inv) => acc + (inv.quantity || 0), 0);
    const latestBatch = product.inventories && product.inventories.length > 0 ? product.inventories[0] : null;
    const batchSellingPrice = latestBatch ? Number(latestBatch.sellingPrice || latestBatch.boxSellingPrice || 0) : 0;
    const computedPrice = override ? Number(override.price) : Number(product.basePrice) > 0 ? Number(product.basePrice) : batchSellingPrice;
    return {
      ...product,
      basePrice: Number(product.basePrice) > 0 ? Number(product.basePrice) : computedPrice,
      effectivePrice: computedPrice,
      hasBranchOverride: !!override,
      currentStock: totalStock,
      batches: product.inventories || []
    };
  }
  static async getProductByBarcode(barcode, tenantId, branchId) {
    const includeOptions = {
      categoryRef: true,
      subcategoryRef: true,
      brandRef: true,
      unitRef: true,
      inventories: {
        where: branchId ? { branchId } : void 0,
        include: {
          branch: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, phone: true } },
          locations: {
            include: { rack: true, shelf: true, bin: true }
          }
        },
        orderBy: { expiryDate: "asc" }
      }
    };
    if (branchId) {
      includeOptions.branchOverrides = { where: { branchId } };
    } else {
      includeOptions.branchOverrides = {
        include: { branch: { select: { id: true, name: true } } }
      };
    }
    const product = await prisma.product.findFirst({
      where: { barcode, tenantId },
      include: includeOptions
    });
    if (!product) {
      throw new Error(`Product with barcode "${barcode}" not found`);
    }
    const override = branchId && product.branchOverrides && product.branchOverrides[0];
    const totalStock = (product.inventories || []).reduce((acc, inv) => acc + (inv.quantity || 0), 0);
    const latestBatch = product.inventories && product.inventories.length > 0 ? product.inventories[0] : null;
    const batchSellingPrice = latestBatch ? Number(latestBatch.sellingPrice || latestBatch.boxSellingPrice || 0) : 0;
    const computedPrice = override ? Number(override.price) : Number(product.basePrice) > 0 ? Number(product.basePrice) : batchSellingPrice;
    return {
      ...product,
      basePrice: Number(product.basePrice) > 0 ? Number(product.basePrice) : computedPrice,
      effectivePrice: computedPrice,
      hasBranchOverride: !!override,
      currentStock: totalStock,
      batches: product.inventories || []
    };
  }
  static async updateProduct(productId, tenantId, userId, data) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId }
    });
    if (!product) {
      throw new Error("Product not found");
    }
    let categoryName = data.category !== void 0 ? data.category : product.category;
    let categoryId = data.categoryId !== void 0 ? data.categoryId : product.categoryId;
    let subcategoryName = data.subcategory !== void 0 ? data.subcategory : product.subcategory;
    let subcategoryId = data.subcategoryId !== void 0 ? data.subcategoryId : product.subcategoryId;
    if (data.categoryId && data.categoryId !== product.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (cat) {
        if (cat.parentId) {
          subcategoryId = cat.id;
          subcategoryName = cat.name;
          const parent = await prisma.category.findUnique({ where: { id: cat.parentId } });
          if (parent) {
            categoryId = parent.id;
            categoryName = parent.name;
          }
        } else {
          categoryId = cat.id;
          categoryName = cat.name;
        }
      }
    }
    if (data.subcategoryId !== void 0 && data.subcategoryId !== product.subcategoryId) {
      if (data.subcategoryId === null || data.subcategoryId === "") {
        subcategoryId = null;
        subcategoryName = null;
      } else {
        const sub = await prisma.category.findUnique({ where: { id: data.subcategoryId } });
        if (sub) {
          subcategoryId = sub.id;
          subcategoryName = sub.name;
        }
      }
    }
    const calculatedType = mapCategoryNameToProductType(categoryName);
    const isMed = calculatedType === "MEDICINE";
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...data.name !== void 0 && { name: data.name.trim() },
        ...data.genericName !== void 0 && { genericName: data.genericName ? data.genericName.trim() : null },
        ...data.sku !== void 0 && { sku: data.sku.trim() },
        ...data.barcode !== void 0 && { barcode: data.barcode },
        ...data.basePrice !== void 0 && { basePrice: data.basePrice },
        category: categoryName,
        categoryId,
        subcategory: subcategoryName,
        subcategoryId,
        productType: calculatedType,
        ...data.brandId !== void 0 && { brandId: data.brandId },
        ...data.unitId !== void 0 && { unitId: data.unitId },
        ...data.brandName !== void 0 && { brandName: data.brandName },
        ...data.manufacturer !== void 0 && { manufacturer: data.manufacturer },
        ...data.unit !== void 0 && { unit: data.unit },
        ...data.size !== void 0 && { size: data.size },
        defaultPackType: data.defaultPackType !== void 0 ? data.defaultPackType : product.defaultPackType,
        qtyPerLevel2: data.qtyPerLevel2 !== void 0 ? data.qtyPerLevel2 ? Number(data.qtyPerLevel2) : null : product.qtyPerLevel2,
        qtyPerLevel3: data.qtyPerLevel3 !== void 0 ? data.qtyPerLevel3 ? Number(data.qtyPerLevel3) : null : product.qtyPerLevel3,
        qtyPerLevel4: data.qtyPerLevel4 !== void 0 ? data.qtyPerLevel4 ? Number(data.qtyPerLevel4) : null : product.qtyPerLevel4,
        stripsPerBox: data.stripsPerBox !== void 0 ? data.stripsPerBox ? Number(data.stripsPerBox) : null : product.stripsPerBox,
        tabletsPerStrip: data.tabletsPerStrip !== void 0 ? data.tabletsPerStrip ? Number(data.tabletsPerStrip) : null : product.tabletsPerStrip,
        ...data.minStockAlert !== void 0 && { minStockAlert: data.minStockAlert },
        ...data.description !== void 0 && { description: data.description },
        ...data.isControlled !== void 0 && { isControlled: data.isControlled },
        ...data.requiresPrescription !== void 0 && { requiresPrescription: data.requiresPrescription },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      },
      include: {
        categoryRef: true,
        subcategoryRef: true,
        brandRef: true,
        unitRef: true
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_UPDATE",
      details: { productId, changes: Object.keys(data) }
    });
    return updated;
  }
  static async deleteProduct(productId, tenantId, userId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        _count: { select: { saleItems: true, inventories: true } }
      }
    });
    if (!product) {
      throw new Error("Product not found");
    }
    if (product._count.saleItems > 0 || product._count.inventories > 0) {
      const deactivated = await prisma.product.update({
        where: { id: productId },
        data: { isActive: false }
      });
      await AuditService.log({
        tenantId,
        userId,
        action: "PRODUCT_DEACTIVATE",
        details: { productId }
      });
      return {
        message: "Product has sales or inventory records and was deactivated.",
        product: deactivated
      };
    }
    await prisma.product.delete({ where: { id: productId } });
    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_DELETE",
      details: { productId }
    });
    return { message: "Product deleted permanently" };
  }
  static async bulkImport(tenantId, userId, data) {
    const results = [];
    for (const item of data.products) {
      const existing = await prisma.product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: item.sku
          }
        }
      });
      const calculatedType = mapCategoryNameToProductType(item.category);
      const isMed = calculatedType === "MEDICINE";
      if (existing) {
        const updated = await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            barcode: item.barcode || existing.barcode,
            basePrice: item.basePrice,
            category: item.category || existing.category,
            categoryId: item.categoryId || existing.categoryId,
            subcategory: item.subcategory || existing.subcategory,
            subcategoryId: item.subcategoryId || existing.subcategoryId,
            productType: calculatedType,
            brandName: item.brandName || existing.brandName,
            manufacturer: item.manufacturer || existing.manufacturer,
            unit: item.unit || existing.unit,
            size: item.size || existing.size,
            stripsPerBox: isMed ? item.stripsPerBox || existing.stripsPerBox : null,
            tabletsPerStrip: isMed ? item.tabletsPerStrip || existing.tabletsPerStrip : null,
            minStockAlert: item.minStockAlert !== void 0 ? item.minStockAlert : existing.minStockAlert,
            description: item.description || existing.description,
            isControlled: item.isControlled !== void 0 ? item.isControlled : existing.isControlled,
            requiresPrescription: item.requiresPrescription !== void 0 ? item.requiresPrescription : existing.requiresPrescription,
            isActive: true
          }
        });
        results.push({ action: "UPDATED", product: updated });
      } else {
        const created = await prisma.product.create({
          data: {
            tenantId,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode || null,
            basePrice: item.basePrice,
            category: item.category || "Medicine",
            categoryId: item.categoryId || null,
            subcategory: item.subcategory || null,
            subcategoryId: item.subcategoryId || null,
            productType: calculatedType,
            brandName: item.brandName || null,
            manufacturer: item.manufacturer || null,
            unit: item.unit || (isMed ? "tablet" : "piece"),
            size: item.size || null,
            stripsPerBox: isMed ? item.stripsPerBox || 10 : null,
            tabletsPerStrip: isMed ? item.tabletsPerStrip || 10 : null,
            minStockAlert: item.minStockAlert || 10,
            description: item.description || null,
            isControlled: item.isControlled || false,
            requiresPrescription: item.requiresPrescription || false,
            isActive: true
          }
        });
        results.push({ action: "CREATED", product: created });
      }
    }
    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_BULK_IMPORT",
      details: { totalProcessed: results.length }
    });
    return {
      totalProcessed: results.length,
      createdCount: results.filter((r) => r.action === "CREATED").length,
      updatedCount: results.filter((r) => r.action === "UPDATED").length,
      items: results
    };
  }
  static async updateBasePrice(productId, tenantId, userId, basePrice) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId }
    });
    if (!product) {
      throw new Error("Product not found");
    }
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { basePrice }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "PRICE_CENTRAL_UPDATE",
      details: { productId, oldPrice: product.basePrice, newPrice: basePrice }
    });
    return updated;
  }
  static async setBranchPriceOverride(productId, tenantId, userId, data) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    if (tenant.tier === "STARTER" || tenant.tier === "TRIAL") {
      throw new Error("Branch-level price overrides require a Growth or Enterprise plan");
    }
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId }
    });
    if (!branch) {
      throw new Error("Branch not found in your company");
    }
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId }
    });
    if (!product) {
      throw new Error("Product not found");
    }
    const override = await prisma.branchProduct.upsert({
      where: {
        branchId_productId: {
          branchId: data.branchId,
          productId
        }
      },
      update: {
        price: data.price
      },
      create: {
        branchId: data.branchId,
        productId,
        price: data.price
      }
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "BRANCH_PRICE_OVERRIDE_SET",
      details: { productId, branchId: data.branchId, overridePrice: data.price }
    });
    return override;
  }
  static async removeBranchPriceOverride(productId, branchId, tenantId, userId) {
    const override = await prisma.branchProduct.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId
        }
      }
    });
    if (!override) {
      throw new Error("No price override found for this product and branch");
    }
    await prisma.branchProduct.delete({
      where: {
        branchId_productId: {
          branchId,
          productId
        }
      }
    });
    await AuditService.log({
      tenantId,
      branchId,
      userId,
      action: "BRANCH_PRICE_OVERRIDE_REMOVED",
      details: { productId, branchId }
    });
    return { message: "Branch price override removed. Standard base price is now active." };
  }
};

// src/modules/upload/upload.service.ts
import fs from "fs";
import path2 from "path";

// src/app/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";
var CloudinaryService = class {
  static isConfigured = false;
  static configure() {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    let apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    let apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      dotenv.config({ path: path.resolve(process.cwd(), ".env") });
      cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
      apiKey = process.env.CLOUDINARY_API_KEY?.trim();
      apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    }
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env."
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    this.isConfigured = true;
    return { cloudName, apiKey, apiSecret };
  }
  /**
   * Uploads an image or document (PDF, PNG, JPG, WEBP, base64 data URI, remote URL, or buffer) to Cloudinary
   */
  static async uploadImage(file, folder = "pharmacy_saas/general") {
    this.configure();
    let filePayload;
    if (Buffer.isBuffer(file)) {
      const isPdf = file.length >= 4 && file[0] === 37 && file[1] === 80 && file[2] === 68 && file[3] === 70;
      if (isPdf) {
        filePayload = `data:application/pdf;base64,${file.toString("base64")}`;
      } else {
        filePayload = `data:image/png;base64,${file.toString("base64")}`;
      }
    } else if (typeof file === "string") {
      const trimmed = file.trim();
      if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        filePayload = trimmed;
      } else if (trimmed.startsWith("JVBERi0")) {
        filePayload = `data:application/pdf;base64,${trimmed}`;
      } else if (trimmed.startsWith("/9j/")) {
        filePayload = `data:image/jpeg;base64,${trimmed}`;
      } else if (trimmed.startsWith("iVBORw0KGgo")) {
        filePayload = `data:image/png;base64,${trimmed}`;
      } else if (trimmed.length > 50 && !trimmed.includes(" ") && !trimmed.includes("\n")) {
        filePayload = `data:image/png;base64,${trimmed}`;
      } else {
        filePayload = trimmed;
      }
    } else {
      throw new Error("Invalid file payload provided to Cloudinary uploader");
    }
    try {
      const result = await cloudinary.uploader.upload(filePayload, {
        folder,
        resource_type: "auto"
      });
      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes
      };
    } catch (error) {
      console.error("[Cloudinary Upload Error]", error);
      throw new Error(
        error.message || "Failed to upload asset to Cloudinary. Please verify Cloudinary API permissions."
      );
    }
  }
  /**
   * Deletes an asset from Cloudinary using its public_id
   */
  static async deleteImage(publicId) {
    if (!publicId) return { success: true, result: "not_found" };
    this.configure();
    try {
      let result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
      });
      if (result.result !== "ok") {
        result = await cloudinary.uploader.destroy(publicId, {
          resource_type: "raw"
        });
      }
      return {
        success: result.result === "ok",
        result: result.result
      };
    } catch (error) {
      console.warn(`[Cloudinary Warning] Could not delete asset with publicId "${publicId}":`, error);
      return { success: false, result: error?.message || "delete_failed" };
    }
  }
};

// src/modules/upload/upload.service.ts
var UploadService = class {
  /**
   * Upload image or document to Cloudinary
   */
  static async uploadImage(fileData, folder = "pharmacy_saas/general", oldPublicId) {
    if (oldPublicId) {
      if (oldPublicId.startsWith("local_")) {
        try {
          const filename = oldPublicId.replace("local_", "");
          const filePath = path2.join(process.cwd(), "public", "uploads", filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
        }
      } else if (!oldPublicId.startsWith("external_")) {
        try {
          await CloudinaryService.deleteImage(oldPublicId);
        } catch (err) {
          console.warn(`[Upload Service] Failed to remove previous Cloudinary asset (${oldPublicId}):`, err);
        }
      }
    }
    try {
      const result = await CloudinaryService.uploadImage(fileData, folder);
      return result;
    } catch (cloudinaryErr) {
      console.error("[Upload Service] Cloudinary upload failed:", cloudinaryErr.message);
      throw new Error(`Cloudinary upload failed: ${cloudinaryErr.message || "Unable to upload asset."}`);
    }
  }
  /**
   * Delete asset from Cloudinary or clean legacy local storage
   */
  static async deleteImage(publicId) {
    if (publicId.startsWith("local_")) {
      try {
        const filename = publicId.replace("local_", "");
        const filePath = path2.join(process.cwd(), "public", "uploads", filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return { success: true, result: "deleted" };
      } catch (e) {
        return { success: false, result: "error" };
      }
    }
    return await CloudinaryService.deleteImage(publicId);
  }
};

// src/app/lib/email.service.ts
import nodemailer from "nodemailer";
import dotenv2 from "dotenv";
dotenv2.config();
function getMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port2 = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
  if (user && pass) {
    if (host.includes("gmail.com")) {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user,
          pass
        }
      });
    }
    return nodemailer.createTransport({
      host,
      port: port2,
      secure: port2 === 465,
      auth: {
        user,
        pass
      }
    });
  }
  return null;
}
function getSenderAddress() {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@pharmabiz.com").trim();
}
var EmailService = class {
  /**
   * Send 6-digit OTP verification email for pharmacy registration.
   * From: SMTP_USER / SMTP_FROM (Platform System Sender)
   * To: Pharmacy Owner's submitted email address
   */
  static async sendOtpEmail(payload) {
    const { to, name, otpCode, companyName } = payload;
    const recipientEmail = (to || "").trim().toLowerCase();
    const senderEmail = getSenderAddress();
    const subject = `[PharmaBiz] Your Verification Code: ${otpCode}`;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.error(`\u274C [EMAIL SERVICE] Invalid recipient email address provided: "${to}"`);
      return { success: false, error: "Invalid recipient email address" };
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
            .body { padding: 32px; }
            .otp-box { background: #f1f5f9; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0284c7; }
            .footer { padding: 20px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>PharmaBiz Platform</h1>
              <p>Pharmacy Verification & Compliance Security</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                Thank you for applying to onboard <strong>${companyName || "Your Pharmacy"}</strong> on PharmaBiz.
                To complete your registration and submit your regulatory documents for review, please enter the following One-Time Password (OTP):
              </p>
              
              <div class="otp-box">
                <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
                <div class="otp-code">${otpCode}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for 15 minutes</div>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not initiate this registration request, please disregard this email.
              </p>
            </div>
            <div class="footer">
              &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} PharmaBiz SaaS Platform &bull; All Rights Reserved.
            </div>
          </div>
        </body>
      </html>
    `;
    console.log(`
========================================================`);
    console.log(`\u{1F4E7} [EMAIL SERVICE] DISPATCHING OTP`);
    console.log(`   FROM (System Sender) : ${senderEmail}`);
    console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
    console.log(`   OTP CODE             : ${otpCode}`);
    console.log(`   PHARMACY             : ${companyName} (${name})`);
    console.log(`========================================================
`);
    try {
      const transporter = getMailTransporter();
      if (transporter) {
        const info = await transporter.sendMail({
          from: `"PharmaBiz Verification" <${senderEmail}>`,
          to: recipientEmail,
          subject,
          html
        });
        console.log(`\u2713 [EMAIL SERVICE] OTP successfully delivered to owner: ${recipientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } else {
        console.warn(`\u26A0\uFE0F [EMAIL SERVICE] SMTP not configured. OTP printed to console.`);
        return { success: true, messageId: `local_${Date.now()}` };
      }
    } catch (err) {
      console.error(`\u274C [EMAIL SERVICE] Failed to send OTP email via SMTP to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }
  /**
   * Send Approval Notification Email with instructions to log in using registration credentials and complete payment to unlock dashboard
   */
  static async sendApprovalEmail(payload) {
    const { to, name, companyName, planName, planTier, billingCycle, price, paymentUrl } = payload;
    const recipientEmail = (to || "").trim().toLowerCase();
    const senderEmail = getSenderAddress();
    const subject = `[PharmaBiz] Your Pharmacy Registration Has Been Approved - ${companyName}`;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.error(`\u274C [EMAIL SERVICE] Invalid recipient email address provided for approval: "${to}"`);
      return { success: false, error: "Invalid recipient email" };
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.95; }
            .body { padding: 32px; }
            .highlight-msg { font-size: 15px; font-weight: 600; line-height: 1.6; color: #0f172a; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 18px 0; }
            .plan-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0; }
            .btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; margin-top: 10px; box-shadow: 0 4px 10px -2px rgba(2, 132, 199, 0.3); }
            .footer { padding: 24px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Pharmacy Registration Approved! \u{1F389}</h1>
              <p>PharmaBiz Multi-Branch Pharmacy SaaS</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              
              <div class="highlight-msg">
                Your pharmacy registration for <strong>${companyName}</strong> has been approved. Please login using the email (<strong>${to}</strong>) and password you provided during registration. Complete the required payment first; after successful payment, you will get access to your dashboard.
              </div>

              <div class="plan-box">
                <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 4px;">Approved Subscription Details</div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${planName} (${planTier})</div>
                <div style="font-size: 13px; color: #475569; margin-top: 6px;">
                  Billing Cycle: <strong>${billingCycle}</strong> &bull; Total Payable: <strong style="font-size: 16px; color: #059669;">\u09F3${price.toLocaleString()}</strong>
                </div>
              </div>

              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${paymentUrl}" class="btn" target="_blank">
                  Login & Complete Payment (\u09F3${price.toLocaleString()}) &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                Direct Link: <br />
                <a href="${paymentUrl}" style="color: #0284c7; word-break: break-all;">${paymentUrl}</a>
              </p>
            </div>
            <div class="footer">
              &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} PharmaBiz SaaS Platform &bull; Regulatory Compliance & Enterprise Management
            </div>
          </div>
        </body>
      </html>
    `;
    console.log(`
========================================================`);
    console.log(`\u{1F4E7} [EMAIL SERVICE] DISPATCHING APPROVAL NOTIFICATION`);
    console.log(`   FROM (System Sender) : ${senderEmail}`);
    console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
    console.log(`   PHARMACY             : ${companyName}`);
    console.log(`   PAYMENT URL          : ${paymentUrl}`);
    console.log(`========================================================
`);
    try {
      const transporter = getMailTransporter();
      if (transporter) {
        const info = await transporter.sendMail({
          from: `"PharmaBiz Approvals" <${senderEmail}>`,
          to: recipientEmail,
          subject,
          html
        });
        console.log(`\u2713 [EMAIL SERVICE] Approval email delivered to ${recipientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      }
      return { success: true, messageId: `local_${Date.now()}` };
    } catch (err) {
      console.error(`\u274C [EMAIL SERVICE] Failed to send Approval email to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }
  /**
   * Send Rejection Notification Email with reason
   */
  static async sendRejectionEmail(payload) {
    const { to, name, companyName, reason } = payload;
    const recipientEmail = (to || "").trim().toLowerCase();
    const senderEmail = getSenderAddress();
    const subject = `[PharmaBiz] Status Update: Pharmacy Application for ${companyName}`;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.error(`\u274C [EMAIL SERVICE] Invalid recipient email address provided for rejection: "${to}"`);
      return { success: false, error: "Invalid recipient email" };
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #b91c1c; padding: 28px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
            .body { padding: 32px; }
            .reason-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 20px 0; color: #991b1b; font-size: 13px; line-height: 1.5; }
            .footer { padding: 20px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Application Status Update</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Regulatory Compliance Review</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                Thank you for your interest in onboarding <strong>${companyName}</strong> on the PharmaBiz platform.
                After reviewing your submitted information and regulatory documents (NID, Trade License, Drug License), our administration team was unable to approve your application at this time.
              </p>
              
              <div class="reason-box">
                <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px;">Reason for Rejection:</div>
                ${reason || "Submitted documents could not be verified or did not meet compliance criteria."}
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #334155;">
                If you believe this is an error or would like to provide updated documentation, please log in to your account to submit corrected documents or reach out to our compliance team at <strong>compliance@pharmabiz.com</strong>.
              </p>
            </div>
            <div class="footer">
              &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} PharmaBiz SaaS Platform &bull; All Rights Reserved.
            </div>
          </div>
        </body>
      </html>
    `;
    console.log(`
========================================================`);
    console.log(`\u{1F4E7} [EMAIL SERVICE] DISPATCHING REJECTION NOTIFICATION`);
    console.log(`   FROM (System Sender) : ${senderEmail}`);
    console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
    console.log(`   PHARMACY             : ${companyName}`);
    console.log(`   REASON               : ${reason}`);
    console.log(`========================================================
`);
    try {
      const transporter = getMailTransporter();
      if (transporter) {
        const info = await transporter.sendMail({
          from: `"PharmaBiz Compliance" <${senderEmail}>`,
          to: recipientEmail,
          subject,
          html
        });
        console.log(`\u2713 [EMAIL SERVICE] Rejection email delivered to ${recipientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      }
      return { success: true, messageId: `local_${Date.now()}` };
    } catch (err) {
      console.error(`\u274C [EMAIL SERVICE] Failed to send Rejection email to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }
  /**
   * Send Automatic Subscription Expiry Reminder Email (2 days before expiry)
   */
  static async sendSubscriptionExpiryReminderEmail(payload) {
    const { to, name, companyName, planName, planTier, expiryDate, renewUrl } = payload;
    const recipientEmail = (to || "").trim().toLowerCase();
    const senderEmail = getSenderAddress();
    const formattedExpiry = new Date(expiryDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const subject = `[PharmaBiz] Urgent: Your Subscription for ${companyName} Expires in 2 Days`;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.error(`\u274C [EMAIL SERVICE] Invalid recipient email address provided for expiry reminder: "${to}"`);
      return { success: false, error: "Invalid recipient email" };
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.95; }
            .body { padding: 32px; }
            .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 18px 20px; margin: 20px 0; color: #92400e; font-size: 14px; line-height: 1.6; }
            .plan-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 20px; margin: 24px 0; }
            .btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 36px; border-radius: 14px; margin-top: 8px; box-shadow: 0 4px 12px -2px rgba(2, 132, 199, 0.35); }
            .footer { padding: 24px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Subscription Expiry Reminder \u23F3</h1>
              <p>PharmaBiz Multi-Branch Pharmacy SaaS</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              
              <div class="alert-box">
                \u26A0\uFE0F <strong>Action Required:</strong> Your current subscription for <strong>${companyName}</strong> will expire in <strong>2 days</strong> on <strong>${formattedExpiry}</strong>.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                To avoid any interruption in POS billing, inventory stock management, and multi-branch operations, please renew your subscription or upgrade to a higher tier plan before the expiration date.
              </p>

              <div class="plan-card">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Current Active Subscription</div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${planName} (${planTier} Tier)</div>
                <div style="font-size: 13px; color: #b45309; font-weight: 700; margin-top: 6px;">
                  Expiration Date: ${formattedExpiry} (2 Days Remaining)
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="${renewUrl}" class="btn" target="_blank">
                  Renew / Upgrade Plan &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                Direct Renewal Link: <br />
                <a href="${renewUrl}" style="color: #0284c7; word-break: break-all;">${renewUrl}</a>
              </p>
            </div>
            <div class="footer">
              &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} PharmaBiz SaaS Platform &bull; Automated Subscription Management System
            </div>
          </div>
        </body>
      </html>
    `;
    console.log(`
========================================================`);
    console.log(`\u{1F4E7} [EMAIL SERVICE] DISPATCHING AUTOMATED 2-DAY EXPIRY REMINDER`);
    console.log(`   FROM (System Sender) : ${senderEmail}`);
    console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
    console.log(`   PHARMACY             : ${companyName} (${name})`);
    console.log(`   CURRENT PLAN         : ${planName} (${planTier})`);
    console.log(`   EXPIRY DATE          : ${formattedExpiry}`);
    console.log(`   RENEWAL URL          : ${renewUrl}`);
    console.log(`========================================================
`);
    try {
      const transporter = getMailTransporter();
      if (transporter) {
        const info = await transporter.sendMail({
          from: `"PharmaBiz Subscriptions" <${senderEmail}>`,
          to: recipientEmail,
          subject,
          html
        });
        console.log(`\u2713 [EMAIL SERVICE] Expiry reminder delivered to ${recipientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      }
      return { success: true, messageId: `local_${Date.now()}` };
    } catch (err) {
      console.error(`\u274C [EMAIL SERVICE] Failed to send Expiry Reminder email to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};

// src/middleware/requirePermission.ts
var DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: ["*"],
  COMPANY_OWNER: ["*"],
  BRANCH_MANAGER: [
    "dashboard.view",
    "pos.manage",
    "pos.history",
    "pos.vat",
    "accounts.payment_sales",
    "accounts.product_sales",
    "accounts.reports",
    "category.manage",
    "category.subcategories",
    "inventory.add_product",
    "inventory.product_list",
    "inventory.manage",
    "inventory.view",
    "product.view",
    "product.create",
    "product.update",
    "stock.manage",
    "stock.add_stock",
    "stock.stock_list",
    "stock.stock_history",
    "stock.allocation",
    "stock.allocation_history",
    "stock.transfer",
    "stock.transfer_history",
    "stock.receive",
    "stock.damaged",
    "location.create_rack",
    "location.rack_list",
    "supplier.view",
    "supplier.manage",
    "supplier.purchase_history",
    "supplier.payments_due",
    "supplier.contacts",
    "suppliers.manage",
    "accounts.overview",
    "accounts.manage",
    "accounts.view",
    "accounts.financial_accounts",
    "accounts.fund_transfer",
    "accounts.transaction_history",
    "accounts.supplier_due",
    "expenses.list",
    "expenses.pay",
    "expenses.history",
    "accounts.expenses",
    "employee.view",
    "attendance.manage",
    "attendance.offdays",
    "salary.deductions",
    "salary.manage",
    "salary.history",
    "accounts.salaries",
    "salaries.base_salary.edit",
    "staff.view",
    "staff.create",
    "staff.manage",
    "branches.manage",
    "reports.view",
    "reports.sales",
    "reports.stock",
    "reports.revenue"
  ],
  INVENTORY_EXECUTIVE: [
    "inventory.add_product",
    "inventory.product_list",
    "inventory.manage",
    "inventory.view",
    "product.view",
    "product.create",
    "product.update",
    "category.manage",
    "category.subcategories",
    "stock.manage",
    "stock.add_stock",
    "stock.stock_list",
    "stock.stock_history",
    "stock.allocation",
    "stock.allocation_history",
    "stock.transfer",
    "stock.transfer_history",
    "stock.receive",
    "stock.damaged",
    "location.create_rack",
    "location.rack_list",
    "supplier.view",
    "supplier.manage",
    "supplier.purchase_history",
    "supplier.contacts",
    "suppliers.manage",
    "reports.stock"
  ],
  CASHIER: [
    "pos.manage",
    "pos.history",
    "sales.pos",
    "sales.create",
    "sales.view_own",
    "stock.stock_list",
    "inventory.product_list",
    "product.view",
    "inventory.view"
  ],
  ACCOUNTS: [
    "dashboard.view",
    "accounts.overview",
    "accounts.manage",
    "accounts.view",
    "accounts.financial_accounts",
    "accounts.fund_transfer",
    "accounts.transaction_history",
    "accounts.supplier_due",
    "accounts.payment_sales",
    "accounts.product_sales",
    "accounts.reports",
    "expenses.list",
    "expenses.pay",
    "expenses.history",
    "accounts.expenses",
    "employee.view",
    "salary.manage",
    "salary.history",
    "salary.deductions",
    "accounts.salaries",
    "supplier.view",
    "supplier.purchase_history",
    "supplier.payments_due",
    "pos.history",
    "reports.view",
    "reports.financial",
    "reports.sales"
  ],
  CTO: [
    "platform.view",
    "platform.analytics",
    "platform.tenants",
    "platform.plans",
    "platform.support",
    "platform.payments",
    "platform.staff",
    "platform.logs",
    "platform.tech_settings"
  ],
  PROJECT_MANAGER: [
    "platform.view",
    "platform.analytics",
    "platform.tenants",
    "platform.plans",
    "platform.support",
    "platform.payments",
    "platform.staff",
    "platform.logs",
    "platform.tech_settings"
  ]
};
var PERMISSION_ALIASES = {
  // Sales & POS
  "pos.manage": ["sales.pos", "sales.create"],
  "sales.pos": ["pos.manage"],
  "pos.history": ["sales.view", "sales.history", "pos.manage"],
  "sales.view": ["pos.history", "pos.manage"],
  "pos.vat": ["pos.manage"],
  "accounts.payment_sales": ["accounts.manage", "pos.history"],
  "accounts.product_sales": ["accounts.manage", "pos.history"],
  "accounts.reports": ["reports.sales", "reports.view", "accounts.manage", "pos.history"],
  "reports.sales": ["accounts.reports", "accounts.manage"],
  "reports.view": ["accounts.reports", "accounts.manage"],
  // Category Management
  "category.manage": ["inventory.manage", "product.create", "product.update", "product.view"],
  "category.subcategories": ["category.manage", "inventory.manage", "product.view"],
  // Inventory
  "inventory.add_product": ["inventory.manage", "product.create"],
  "product.create": ["inventory.add_product", "inventory.manage"],
  "inventory.product_list": ["inventory.manage", "inventory.view", "product.view"],
  "product.view": ["inventory.product_list", "inventory.manage", "inventory.view"],
  "product.update": ["inventory.manage", "inventory.add_product"],
  "inventory.view": ["inventory.product_list", "inventory.manage", "stock.manage", "stock.stock_list"],
  "inventory.manage": ["inventory.add_product", "inventory.product_list"],
  // Stock Management
  "stock.add_stock": ["stock.manage", "inventory.add_stock", "inventory.manage"],
  "inventory.add_stock": ["stock.add_stock", "stock.manage", "inventory.manage"],
  "stock.stock_list": ["stock.manage", "inventory.view", "inventory.manage", "product.view"],
  "stock.stock_history": ["stock.manage", "inventory.view", "inventory.manage"],
  "stock.allocation": ["stock.manage", "inventory.adjust", "inventory.manage"],
  "stock.allocation_history": ["stock.manage", "inventory.view", "inventory.manage"],
  "stock.transfer": ["stock.manage", "inventory.transfer"],
  "stock.transfer_history": ["stock.manage", "inventory.transfer"],
  "stock.receive": ["stock.manage", "inventory.transfer"],
  "stock.damaged": ["stock.manage", "inventory.manage", "inventory.adjust"],
  "inventory.adjust": ["stock.manage", "stock.allocation", "stock.damaged"],
  "inventory.transfer": ["stock.manage", "stock.transfer", "stock.receive"],
  "stock.manage": [
    "stock.add_stock",
    "stock.stock_list",
    "stock.stock_history",
    "stock.allocation",
    "stock.allocation_history",
    "stock.transfer",
    "stock.transfer_history",
    "stock.receive",
    "stock.damaged",
    "inventory.transfer"
  ],
  // Location Management
  "location.create_rack": ["location.manage", "stock.manage", "inventory.manage"],
  "location.rack_list": ["location.view", "location.manage", "stock.manage", "inventory.manage", "stock.stock_list"],
  "location.manage": ["location.create_rack", "location.rack_list", "stock.manage"],
  "location.view": ["location.rack_list", "location.manage", "stock.manage"],
  // Supplier Management
  "supplier.view": ["supplier.manage", "suppliers.manage"],
  "supplier.manage": ["suppliers.manage"],
  "suppliers.manage": ["supplier.manage"],
  "supplier.purchase_history": ["supplier.manage", "suppliers.manage", "supplier.view"],
  "supplier.payments_due": ["accounts.supplier_due", "supplier.manage", "suppliers.manage", "accounts.manage"],
  "supplier.contacts": ["supplier.manage", "suppliers.manage"],
  // Accounts & Finance
  "accounts.overview": ["accounts.view", "accounts.manage"],
  "accounts.view": ["accounts.manage", "accounts.overview", "accounts.reports", "accounts.transfer", "dashboard.view"],
  "accounts.manage": ["accounts.view", "accounts.overview", "accounts.transfer"],
  "accounts.financial_accounts": ["accounts.manage"],
  "accounts.fund_transfer": ["accounts.transfer", "accounts.manage"],
  "accounts.transfer": ["accounts.fund_transfer", "accounts.manage"],
  "accounts.transaction_history": ["accounts.view", "accounts.manage"],
  "accounts.supplier_due": ["supplier.payments_due", "accounts.manage", "suppliers.manage"],
  // Expenses & Bills
  "expenses.list": ["accounts.expenses", "accounts.manage"],
  "expenses.pay": ["accounts.expenses", "accounts.manage"],
  "expenses.history": ["accounts.expenses", "accounts.manage"],
  "accounts.expenses": ["expenses.list", "expenses.pay", "expenses.history", "accounts.manage"],
  // Employee & Salary
  "employee.view": ["accounts.salaries", "accounts.manage", "staff.manage"],
  "attendance.manage": ["accounts.salaries", "staff.manage", "accounts.manage"],
  "attendance.offdays": ["attendance.manage", "accounts.salaries"],
  "salary.deductions": ["attendance.offdays", "attendance.manage", "accounts.salaries", "accounts.manage"],
  "salary.manage": ["accounts.salaries", "accounts.manage"],
  "salary.history": ["accounts.salaries", "accounts.manage"],
  "salaries.base_salary.edit": ["accounts.salaries", "accounts.manage"],
  "accounts.salaries": ["salary.manage", "salary.history", "salary.deductions", "accounts.manage"],
  // Staff Management
  "staff.view": ["staff.manage", "user.view", "user.manage"],
  "staff.create": ["staff.manage", "user.create", "user.manage"],
  "roles.manage": ["staff.manage"],
  "staff.manage": ["staff.view", "staff.create", "roles.manage", "user.create", "user.view", "user.update", "user.manage"],
  // Organization
  "branches.manage": [],
  "settings.manage": []
};
function hasMatchingPermission(userPerms, requiredPerm) {
  if (userPerms.includes("*") || userPerms.includes(requiredPerm)) {
    return true;
  }
  const grantingPerms = PERMISSION_ALIASES[requiredPerm] || [];
  if (grantingPerms.some((granting) => userPerms.includes(granting))) {
    return true;
  }
  return false;
}
var requirePermission = (permissionString) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized - User not authenticated" });
        return;
      }
      const role = req.user.role;
      if (role === "SUPER_ADMIN") {
        next();
        return;
      }
      if (role === "COMPANY_OWNER") {
        next();
        return;
      }
      const userPerms = req.user.permissions || [];
      if (hasMatchingPermission(userPerms, permissionString)) {
        next();
        return;
      }
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { customRole: true, pharmacyRole: true }
      });
      if (dbUser) {
        const directPermissions = dbUser.permissions || [];
        if (hasMatchingPermission(directPermissions, permissionString)) {
          next();
          return;
        }
        if (dbUser.pharmacyRole && dbUser.pharmacyRole.permissions) {
          const pharmacyRolePermissions = dbUser.pharmacyRole.permissions || [];
          if (hasMatchingPermission(pharmacyRolePermissions, permissionString)) {
            next();
            return;
          }
        }
        if (dbUser.customRole && dbUser.customRole.permissions) {
          const rolePermissions = dbUser.customRole.permissions || [];
          if (hasMatchingPermission(rolePermissions, permissionString)) {
            next();
            return;
          }
        }
      }
      const rolePerm = await prisma.rolePermission.findUnique({
        where: {
          role_permission: {
            role,
            permission: permissionString
          }
        }
      });
      if (rolePerm) {
        next();
        return;
      }
      const isBranchManager = role === "BRANCH_MANAGER" || req.user.pharmacyRoleName?.toLowerCase().includes("branch manager") || req.user.customRoleName?.toLowerCase().includes("branch manager") || dbUser?.pharmacyRole?.name?.toLowerCase().includes("branch manager") || dbUser?.customRole?.name?.toLowerCase().includes("branch manager");
      const effectiveRoleKey = isBranchManager ? "BRANCH_MANAGER" : role;
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey] || DEFAULT_ROLE_PERMISSIONS[role] || [];
      if (hasMatchingPermission(defaultPerms, permissionString)) {
        next();
        return;
      }
      res.status(403).json({
        success: false,
        message: `Forbidden - You do not have permission (${permissionString}) to perform this action.`
      });
    } catch (err) {
      console.error("Permission Check Error:", err);
      res.status(500).json({ success: false, message: "Internal server error during permission check" });
    }
  };
};

// src/modules/auth/auth.service.ts
var AuthService = class {
  /**
   * Log in via username or email
   */
  static async login(data) {
    const identifier = (data.username || data.email || "").trim();
    if (!identifier) {
      throw new Error("Username or email is required");
    }
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier }
        ]
      },
      include: {
        tenant: {
          include: {
            subscriptions: {
              where: { status: "ACTIVE" },
              include: { plan: true },
              take: 1
            }
          }
        }
      }
    });
    if (!user) {
      throw new Error("Invalid username/email or password");
    }
    if (!user.isActive) {
      throw new Error("Your user account has been deactivated. Please contact support.");
    }
    const isPasswordValid = await bcrypt2.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid username/email or password");
    }
    let effectivePermissions = user.permissions || [];
    let customRoleName = user.customRoleName || null;
    let pharmacyRoleName = user.pharmacyRoleName || null;
    if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_OWNER") {
      effectivePermissions = ["*"];
    } else if (user.pharmacyRoleId) {
      try {
        const pharmacyRole = await prisma.pharmacyRole.findUnique({
          where: { id: user.pharmacyRoleId }
        });
        if (pharmacyRole) {
          pharmacyRoleName = pharmacyRole.name;
          const combined = /* @__PURE__ */ new Set([...pharmacyRole.permissions || [], ...user.permissions || []]);
          effectivePermissions = Array.from(combined);
        }
      } catch (e) {
      }
    } else if (user.customRoleId) {
      try {
        const customRole = await prisma.platformRole.findUnique({
          where: { id: user.customRoleId }
        });
        if (customRole) {
          customRoleName = customRole.name;
          const combined = /* @__PURE__ */ new Set([...customRole.permissions || [], ...user.permissions || []]);
          effectivePermissions = Array.from(combined);
        }
      } catch (e) {
      }
    } else if (effectivePermissions.length === 0 && DEFAULT_ROLE_PERMISSIONS[user.role]) {
      effectivePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    }
    const tenantVerificationStatus = user.tenant?.verificationStatus || "ACTIVE";
    const requiresOtp = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "PENDING_OTP";
    const paymentRequired = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "APPROVED_PENDING_PAYMENT";
    const payload = {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      customRoleId: user.customRoleId || null,
      customRoleName,
      pharmacyRoleId: user.pharmacyRoleId || null,
      pharmacyRoleName,
      permissions: effectivePermissions,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      verificationStatus: tenantVerificationStatus,
      rejectionReason: user.tenant?.rejectionReason || null,
      requiresOtp,
      paymentRequired,
      tenant: user.tenant ? {
        id: user.tenant.id,
        name: user.tenant.name,
        logoUrl: user.tenant.logoUrl || null,
        logoPublicId: user.tenant.logoPublicId || null,
        email: user.tenant.email || null,
        phone: user.tenant.phone || null,
        address: user.tenant.address || null
      } : null
    };
    const secret = process.env.JWT_SECRET || "default_secret";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign(payload, secret, { expiresIn });
    const pendingSub = await prisma.subscription.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" }
    });
    return {
      token,
      user: payload,
      verificationStatus: tenantVerificationStatus,
      requiresOtp,
      paymentRequired,
      rejectionReason: user.tenant?.rejectionReason || null,
      subscriptionId: pendingSub?.id || null
    };
  }
  /**
   * Get current authenticated user with live permissions & verification status
   */
  static async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true
      }
    });
    if (!user) {
      throw new Error("User not found");
    }
    let effectivePermissions = user.permissions || [];
    let customRoleName = user.customRoleName || null;
    let pharmacyRoleName = user.pharmacyRoleName || null;
    if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_OWNER") {
      effectivePermissions = ["*"];
    } else if (user.pharmacyRoleId) {
      try {
        const pharmacyRole = await prisma.pharmacyRole.findUnique({
          where: { id: user.pharmacyRoleId }
        });
        if (pharmacyRole) {
          pharmacyRoleName = pharmacyRole.name;
          const combined = /* @__PURE__ */ new Set([...pharmacyRole.permissions || [], ...user.permissions || []]);
          effectivePermissions = Array.from(combined);
        }
      } catch (e) {
      }
    } else if (user.customRoleId) {
      try {
        const customRole = await prisma.platformRole.findUnique({
          where: { id: user.customRoleId }
        });
        if (customRole) {
          customRoleName = customRole.name;
          const combined = /* @__PURE__ */ new Set([...customRole.permissions || [], ...user.permissions || []]);
          effectivePermissions = Array.from(combined);
        }
      } catch (e) {
      }
    } else if (effectivePermissions.length === 0 && DEFAULT_ROLE_PERMISSIONS[user.role]) {
      effectivePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    }
    const tenantVerificationStatus = user.tenant?.verificationStatus || "ACTIVE";
    const requiresOtp = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "PENDING_OTP";
    const paymentRequired = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "APPROVED_PENDING_PAYMENT";
    return {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      customRoleId: user.customRoleId || null,
      customRoleName,
      pharmacyRoleId: user.pharmacyRoleId || null,
      pharmacyRoleName,
      permissions: effectivePermissions,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      verificationStatus: tenantVerificationStatus,
      rejectionReason: user.tenant?.rejectionReason || null,
      requiresOtp,
      paymentRequired,
      tenant: user.tenant ? {
        id: user.tenant.id,
        name: user.tenant.name,
        logoUrl: user.tenant.logoUrl || null,
        logoPublicId: user.tenant.logoPublicId || null,
        email: user.tenant.email || null,
        phone: user.tenant.phone || null,
        address: user.tenant.address || null
      } : null
    };
  }
  /**
   * Register Pharmacy Owner with Regulatory Documents, OTP dispatch, and initial verification state
   */
  static async registerOwner(data) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { username: { equals: normalizedEmail, mode: "insensitive" } }
        ]
      },
      include: { tenant: true }
    });
    if (existingUser) {
      if (existingUser.tenant && existingUser.tenant.verificationStatus === "PENDING_OTP") {
        try {
          await prisma.tenant.delete({
            where: { id: existingUser.tenant.id }
          });
        } catch (e) {
          console.warn("[registerOwner] Could not delete stale PENDING_OTP tenant:", e);
        }
      } else {
        throw new Error("An account or pending application already exists for this email address. Please login instead.");
      }
    }
    const nidFront = data.nidFrontDocument || data.nidDocument;
    const nidBack = data.nidBackDocument;
    const tradeDoc = data.tradeLicenseDocument || data.tradeLicenseFrontDocument;
    const tradeBack = data.tradeLicenseBackDocument;
    const drugDoc = data.drugLicenseDocument || data.drugLicenseFrontDocument;
    const drugBack = data.drugLicenseBackDocument;
    if (!nidFront) {
      throw new Error("NID Front document is required.");
    }
    if (!nidBack) {
      throw new Error("NID Back document is required.");
    }
    if (!tradeDoc) {
      throw new Error("Trade License document is required (PDF, JPG, or PNG).");
    }
    if (!drugDoc) {
      throw new Error("DGDA Drug License document is required (PDF, JPG, or PNG).");
    }
    let nidFrontUpload = { secureUrl: "", publicId: "" };
    let nidBackUpload = null;
    let tradeDocUpload = { secureUrl: "", publicId: "" };
    let tradeBackUpload = null;
    let drugDocUpload = { secureUrl: "", publicId: "" };
    let drugBackUpload = null;
    try {
      const uploadTasks = [
        UploadService.uploadImage(nidFront, "pharmacy_saas/documents/nid_front"),
        UploadService.uploadImage(nidBack, "pharmacy_saas/documents/nid_back"),
        tradeDoc ? UploadService.uploadImage(tradeDoc, "pharmacy_saas/documents/trade") : Promise.resolve({ secureUrl: "", publicId: "" }),
        drugDoc ? UploadService.uploadImage(drugDoc, "pharmacy_saas/documents/drug") : Promise.resolve({ secureUrl: "", publicId: "" })
      ];
      if (tradeBack) uploadTasks.push(UploadService.uploadImage(tradeBack, "pharmacy_saas/documents/trade_back"));
      else uploadTasks.push(Promise.resolve(null));
      if (drugBack) uploadTasks.push(UploadService.uploadImage(drugBack, "pharmacy_saas/documents/drug_back"));
      else uploadTasks.push(Promise.resolve(null));
      const [nFront, nBack, tDoc, dDoc, tBack, dBack] = await Promise.all(uploadTasks);
      nidFrontUpload = nFront;
      nidBackUpload = nBack;
      tradeDocUpload = tDoc;
      drugDocUpload = dDoc;
      tradeBackUpload = tBack;
      drugBackUpload = dBack;
    } catch (uploadErr) {
      console.error("[registerOwner] Document upload failed:", uploadErr);
      throw new Error(`Document upload error: ${uploadErr.message || "Failed to upload regulatory documents."}`);
    }
    let plan = null;
    if (data.planId) {
      plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.planId }
      });
    }
    if (!plan) {
      plan = await prisma.subscriptionPlan.findFirst({
        where: { tier: "STARTER", isActive: true }
      }) || await prisma.subscriptionPlan.findFirst({
        where: { isActive: true }
      });
    }
    const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1e3);
    const passwordHash = await bcrypt2.hash(data.password, 10);
    const durationDays = data.billingCycle === "YEARLY" ? 365 : 30;
    const startDate = /* @__PURE__ */ new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          tier: plan ? plan.tier : "STARTER",
          email: normalizedEmail,
          phone: data.phone,
          address: data.address || "HQ Location",
          isActive: false,
          // Inactive until approved and paid
          // Verification & Regulatory Documents
          verificationStatus: "PENDING_OTP",
          nidNumber: data.nidNumber,
          nidDocUrl: nidFrontUpload.secureUrl,
          nidDocPublicId: nidFrontUpload.publicId,
          nidFrontUrl: nidFrontUpload.secureUrl,
          nidFrontPublicId: nidFrontUpload.publicId,
          nidBackUrl: nidBackUpload?.secureUrl || null,
          nidBackPublicId: nidBackUpload?.publicId || null,
          tradeLicenseNumber: data.tradeLicenseNumber,
          tradeLicenseDocUrl: tradeDocUpload.secureUrl,
          tradeLicenseDocPublicId: tradeDocUpload.publicId,
          tradeLicenseFrontUrl: tradeDocUpload.secureUrl,
          tradeLicenseFrontPublicId: tradeDocUpload.publicId,
          tradeLicenseBackUrl: tradeBackUpload?.secureUrl || null,
          tradeLicenseBackPublicId: tradeBackUpload?.publicId || null,
          drugLicenseNumber: data.drugLicenseNumber,
          drugLicenseDocUrl: drugDocUpload.secureUrl,
          drugLicenseDocPublicId: drugDocUpload.publicId,
          drugLicenseFrontUrl: drugDocUpload.secureUrl,
          drugLicenseFrontPublicId: drugDocUpload.publicId,
          drugLicenseBackUrl: drugBackUpload?.secureUrl || null,
          drugLicenseBackPublicId: drugBackUpload?.publicId || null,
          // OTP
          otpCode,
          otpExpiresAt,
          // Pending Plan Selection
          pendingPlanId: plan?.id,
          pendingBillingCycle: data.billingCycle || "MONTHLY"
        }
      });
      const mainBranch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: "Main Branch",
          phone: data.phone,
          location: data.address || "HQ Location",
          isActive: true
        }
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: mainBranch.id,
          username: normalizedEmail,
          email: normalizedEmail,
          name: data.ownerName,
          phone: data.phone,
          role: "COMPANY_OWNER",
          passwordHash,
          isActive: true
        }
      });
      const subscription = await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan ? plan.id : (await tx.subscriptionPlan.findFirst())?.id,
          status: "PENDING",
          startDate,
          endDate,
          autoRenew: false
        },
        include: {
          plan: true
        }
      });
      return { tenant, user, mainBranch, subscription };
    });
    ProductService.seedDefaultCatalogVariants(result.tenant.id).catch((err) => {
      console.error("[registerOwner] Error seeding default catalog variants:", err);
    });
    await EmailService.sendOtpEmail({
      to: normalizedEmail,
      name: data.ownerName,
      otpCode,
      companyName: data.companyName
    });
    const payload = {
      id: result.user.id,
      tenantId: result.tenant.id,
      branchId: result.mainBranch.id,
      role: result.user.role,
      permissions: ["*"],
      username: result.user.username,
      name: result.user.name,
      email: result.user.email,
      verificationStatus: "PENDING_OTP",
      requiresOtp: true
    };
    const secret = process.env.JWT_SECRET || "default_secret";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign(payload, secret, { expiresIn });
    return {
      token,
      user: payload,
      tenant: result.tenant,
      branch: result.mainBranch,
      subscription: result.subscription,
      verificationStatus: "PENDING_OTP",
      requiresOtp: true,
      message: "Registration submitted successfully. Please verify the 6-digit OTP sent to your email."
    };
  }
  /**
   * Verify 6-digit email OTP
   */
  static async verifyOtp(data) {
    const normalizedEmail = (data.email || "").trim().toLowerCase();
    const cleanOtpCode = (data.otpCode || "").replace(/\D/g, "").trim();
    const tenantId = data.tenantId?.trim();
    let tenant = null;
    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });
    }
    if (!tenant && normalizedEmail) {
      tenant = await prisma.tenant.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        orderBy: { createdAt: "desc" }
      });
    }
    if (!tenant) {
      throw new Error("No pharmacy registration found for this email address.");
    }
    if (tenant.verificationStatus !== "PENDING_OTP") {
      return {
        success: true,
        alreadyVerified: true,
        verificationStatus: tenant.verificationStatus,
        message: "Email has already been verified.",
        tenant
      };
    }
    if (!tenant.otpCode || tenant.otpCode !== cleanOtpCode) {
      throw new Error("Invalid verification OTP code. Please check your email and try again.");
    }
    if (tenant.otpExpiresAt && /* @__PURE__ */ new Date() > new Date(tenant.otpExpiresAt)) {
      throw new Error("This verification OTP has expired. Please click 'Resend OTP' to get a new code.");
    }
    const updateResult = await prisma.tenant.updateMany({
      where: {
        id: tenant.id,
        verificationStatus: "PENDING_OTP",
        otpCode: cleanOtpCode
      },
      data: {
        verificationStatus: "PENDING_APPROVAL",
        otpVerifiedAt: /* @__PURE__ */ new Date(),
        otpCode: null,
        otpExpiresAt: null
      }
    });
    if (updateResult.count === 0) {
      const reFetched = await prisma.tenant.findUnique({ where: { id: tenant.id } });
      if (reFetched && reFetched.verificationStatus !== "PENDING_OTP") {
        return {
          success: true,
          alreadyVerified: true,
          verificationStatus: reFetched.verificationStatus,
          message: "Email has already been verified.",
          tenant: reFetched
        };
      }
      throw new Error("OTP verification could not be completed. Please try again.");
    }
    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    return {
      success: true,
      verificationStatus: "PENDING_APPROVAL",
      message: "Email successfully verified! Your pharmacy application is now under review by our administration team.",
      tenant: updatedTenant
    };
  }
  /**
   * Resend 6-digit email OTP
   */
  static async resendOtp(data) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const tenant = await prisma.tenant.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      include: { users: { where: { role: "COMPANY_OWNER" }, take: 1 } }
    });
    if (!tenant) {
      throw new Error("No pharmacy application found for this email address.");
    }
    if (tenant.verificationStatus !== "PENDING_OTP") {
      throw new Error("Email has already been verified.");
    }
    const newOtp = Math.floor(1e5 + Math.random() * 9e5).toString();
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1e3);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        otpCode: newOtp,
        otpExpiresAt: newExpiresAt
      }
    });
    const ownerUser = tenant.users?.[0];
    await EmailService.sendOtpEmail({
      to: normalizedEmail,
      name: ownerUser?.name || tenant.name,
      otpCode: newOtp,
      companyName: tenant.name
    });
    return {
      success: true,
      message: "A new 6-digit verification OTP has been sent to your email."
    };
  }
  /**
   * Check verification and subscription status
   */
  static async getVerificationStatus(identifier) {
    const cleanIdentifier = identifier.trim();
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: cleanIdentifier },
          { email: { equals: cleanIdentifier, mode: "insensitive" } }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        users: { where: { role: "COMPANY_OWNER" }, take: 1 },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true }
        }
      }
    });
    if (!tenant) {
      throw new Error("Application record not found.");
    }
    const latestSub = tenant.subscriptions?.[0] || null;
    const plan = latestSub?.plan || null;
    const isApproved = tenant.verificationStatus === "APPROVED_PENDING_PAYMENT";
    const isActive = tenant.verificationStatus === "ACTIVE";
    const isRejected = tenant.verificationStatus === "REJECTED";
    const isPendingApproval = tenant.verificationStatus === "PENDING_APPROVAL";
    const isPendingOtp = tenant.verificationStatus === "PENDING_OTP";
    return {
      tenantId: tenant.id,
      companyName: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      ownerName: tenant.users?.[0]?.name,
      verificationStatus: tenant.verificationStatus,
      // Documents (Front & Back)
      nidNumber: tenant.nidNumber,
      nidDocUrl: tenant.nidDocUrl,
      nidFrontUrl: tenant.nidFrontUrl || tenant.nidDocUrl,
      nidBackUrl: tenant.nidBackUrl,
      tradeLicenseNumber: tenant.tradeLicenseNumber,
      tradeLicenseDocUrl: tenant.tradeLicenseDocUrl,
      tradeLicenseFrontUrl: tenant.tradeLicenseFrontUrl || tenant.tradeLicenseDocUrl,
      tradeLicenseBackUrl: tenant.tradeLicenseBackUrl,
      drugLicenseNumber: tenant.drugLicenseNumber,
      drugLicenseDocUrl: tenant.drugLicenseDocUrl,
      drugLicenseFrontUrl: tenant.drugLicenseFrontUrl || tenant.drugLicenseDocUrl,
      drugLicenseBackUrl: tenant.drugLicenseBackUrl,
      // Audit info
      submittedAt: tenant.createdAt,
      otpVerifiedAt: tenant.otpVerifiedAt,
      approvedAt: tenant.approvedAt,
      approvalNotes: tenant.approvalNotes,
      rejectedAt: tenant.rejectedAt,
      rejectionReason: tenant.rejectionReason,
      // Plan & Payment info
      plan,
      subscriptionId: latestSub?.id,
      billingCycle: tenant.pendingBillingCycle,
      paymentRequired: isApproved,
      isApproved,
      isActive,
      isRejected,
      isPendingApproval,
      isPendingOtp
    };
  }
};

// src/modules/auth/auth.controller.ts
var AuthController = class {
  /**
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const parsedBody = loginSchema.parse(req.body);
      const result = await AuthService.login(parsedBody);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors
        });
        return;
      }
      res.status(401).json({
        success: false,
        message: error.message || "Authentication failed"
      });
    }
  }
  /**
   * POST /api/auth/register-owner
   */
  static async registerOwner(req, res) {
    try {
      const parsedBody = registerOwnerSchema.parse(req.body);
      const result = await AuthService.registerOwner(parsedBody);
      res.status(201).json({
        success: true,
        message: "Pharmacy owner registered successfully. Proceeding to subscription payment.",
        data: result
      });
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed"
      });
    }
  }
  /**
   * POST /api/auth/verify-otp
   */
  static async verifyOtp(req, res) {
    try {
      const parsedBody = verifyOtpSchema.parse(req.body);
      const result = await AuthService.verifyOtp(parsedBody);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: error.message || "OTP verification failed"
      });
    }
  }
  /**
   * POST /api/auth/resend-otp
   */
  static async resendOtp(req, res) {
    try {
      const parsedBody = resendOtpSchema.parse(req.body);
      const result = await AuthService.resendOtp(parsedBody);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: error.message || "Failed to resend OTP"
      });
    }
  }
  /**
   * GET /api/auth/verification-status
   */
  static async getVerificationStatus(req, res) {
    try {
      const identifier = req.query.identifier || req.query.email || req.query.tenantId;
      if (!identifier) {
        res.status(400).json({
          success: false,
          message: "Email or tenantId is required as identifier"
        });
        return;
      }
      const result = await AuthService.getVerificationStatus(identifier);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Could not retrieve verification status"
      });
    }
  }
  /**
   * GET /api/auth/me
   */
  static async getMe(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }
      const user = await AuthService.getMe(req.user.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/middleware/authenticate.ts
import jwt2 from "jsonwebtoken";
var authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Authorization token missing or invalid" });
      return;
    }
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_secret";
    const decoded = jwt2.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
var optionalAuthenticate = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const secret = process.env.JWT_SECRET || "default_secret";
      const decoded = jwt2.verify(token, secret);
      req.user = decoded;
    }
  } catch (error) {
  }
  next();
};

// src/modules/auth/auth.routes.ts
var router = Router();
router.post("/login", AuthController.login);
router.post("/register-owner", AuthController.registerOwner);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/resend-otp", AuthController.resendOtp);
router.get("/verification-status", AuthController.getVerificationStatus);
router.get("/me", authenticate, AuthController.getMe);

// src/modules/super-admin/super-admin.routes.ts
import { Router as Router2 } from "express";

// src/modules/super-admin/super-admin.service.ts
var SuperAdminService = class _SuperAdminService {
  /**
   * Helper: Calculate Prisma date range filter for date presets and custom date ranges
   */
  static getDateRangeFilter(datePreset, startDate, endDate) {
    if (!datePreset || datePreset === "ALL") return void 0;
    const now = /* @__PURE__ */ new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    if (datePreset === "TODAY") {
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { gte: startOfToday, lte: endOfToday };
    }
    if (datePreset === "YESTERDAY") {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(startOfToday);
      endOfYesterday.setMilliseconds(-1);
      return { gte: startOfYesterday, lte: endOfYesterday };
    }
    if (datePreset === "THIS_MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { gte: startOfMonth, lte: endOfMonth };
    }
    if (datePreset === "LAST_MONTH") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { gte: startOfLastMonth, lte: endOfLastMonth };
    }
    if (datePreset === "THIS_YEAR") {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { gte: startOfYear, lte: endOfYear };
    }
    if (datePreset === "CUSTOM") {
      const filter = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.lte = e;
      }
      return Object.keys(filter).length > 0 ? filter : void 0;
    }
    return void 0;
  }
  /**
   * Plans Management
   */
  static async createPlan(data) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { tier: data.tier }
    });
    if (existing) {
      throw new Error(`A subscription plan already exists for tier ${data.tier}. Please update the existing plan.`);
    }
    return await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        tier: data.tier,
        price: data.price,
        billingCycle: data.billingCycle,
        maxBranches: data.maxBranches,
        features: data.features || {},
        isActive: data.isActive
      }
    });
  }
  static async listPlans() {
    return await prisma.subscriptionPlan.findMany({
      orderBy: { price: "asc" },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });
  }
  static async getPlanById(id) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            tenant: {
              select: { id: true, name: true, tier: true, isActive: true }
            }
          }
        }
      }
    });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }
    return plan;
  }
  static async updatePlan(id, data) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }
    return await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...data.name && { name: data.name },
        ...data.price !== void 0 && { price: data.price },
        ...data.billingCycle && { billingCycle: data.billingCycle },
        ...data.maxBranches !== void 0 && { maxBranches: data.maxBranches },
        ...data.features && { features: data.features },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
  }
  static async deletePlan(id) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } }
    });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }
    if (plan._count.subscriptions > 0) {
      return await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false }
      });
    }
    return await prisma.subscriptionPlan.delete({ where: { id } });
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
            { email: { contains: query.search, mode: "insensitive" } }
          ]
        }
      ];
    }
    if (query.tier) {
      where.tier = query.tier;
    }
    if (query.isActive !== void 0) {
      where.isActive = query.isActive;
    }
    const dateRange = _SuperAdminService.getDateRangeFilter(query.datePreset, query.startDate, query.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }
    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { branches: true, users: true }
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            include: { plan: true },
            take: 1
          }
        }
      })
    ]);
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
      subscriptions: t.subscriptions || []
    }));
    return {
      data: formattedTenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async getTenantDetails(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            email: true,
            isActive: true,
            createdAt: true
          }
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
            createdAt: true
          }
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: true,
            payments: {
              orderBy: { createdAt: "desc" }
            }
          }
        },
        payments: {
          orderBy: { createdAt: "desc" },
          include: {
            subscription: {
              include: { plan: true }
            }
          }
        }
      }
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    return tenant;
  }
  static async getTenantSubscription(tenantId) {
    const subscriptions = await prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true, payments: true }
    });
    return subscriptions;
  }
  static async updateTenantStatus(id, isActive) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    if (tenant.name === "Platform HQ") {
      throw new Error("Platform HQ system tenant status cannot be modified or suspended.");
    }
    return await prisma.tenant.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        tier: true,
        isActive: true,
        updatedAt: true
      }
    });
  }
  /**
   * Platform Subscriptions List
   */
  static async listSubscriptions(page = 1, limit = 50, status, query) {
    const skip = (page - 1) * limit;
    const where = { tenant: { name: { not: "Platform HQ" } } };
    if (status && status !== "ALL") {
      where.status = status;
    }
    const dateRange = _SuperAdminService.getDateRangeFilter(query?.datePreset, query?.startDate, query?.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }
    if (query?.tier) {
      where.tenant = { ...where.tenant, tier: query.tier };
    }
    if (query?.search) {
      const searchStr = query.search.trim();
      where.AND = [
        {
          OR: [
            { tenant: { name: { contains: searchStr, mode: "insensitive" } } },
            { tenant: { email: { contains: searchStr, mode: "insensitive" } } },
            { plan: { name: { contains: searchStr, mode: "insensitive" } } }
          ]
        }
      ];
    }
    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, tier: true, email: true, phone: true, isActive: true }
          },
          plan: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      })
    ]);
    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Platform Payments & Transactions
   */
  static async listPlatformPayments(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = { tenant: { name: { not: "Platform HQ" } } };
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, tier: true }
          },
          subscription: {
            include: { plan: true }
          }
        }
      })
    ]);
    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Helper: Generate time-series buckets for Pharmacy Growth line graph
   */
  static generatePharmacyGrowthSeries(datePreset, startDateStr, endDateStr, approvedTenants = []) {
    const now = /* @__PURE__ */ new Date();
    const preset = datePreset || "ALL";
    const buckets = [];
    if (preset === "TODAY" || preset === "YESTERDAY") {
      const targetDate = preset === "TODAY" ? new Date(now) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();
      const hours = [0, 4, 8, 12, 16, 20, 24];
      for (let i = 0; i < hours.length - 1; i++) {
        const hStart = hours[i];
        const hEnd = hours[i + 1];
        const start = new Date(y, m, d, hStart, 0, 0, 0);
        const end = new Date(y, m, d, hEnd - 1, 59, 59, 999);
        const pad = (n) => n.toString().padStart(2, "0");
        buckets.push({
          label: `${pad(hStart)}:00`,
          date: start.toISOString(),
          start,
          end
        });
      }
    } else if (preset === "THIS_MONTH" || preset === "LAST_MONTH") {
      const mOffset = preset === "THIS_MONTH" ? 0 : -1;
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + mOffset, 1);
      const y = targetMonthDate.getFullYear();
      const m = targetMonthDate.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const monthShort = targetMonthDate.toLocaleString("en-US", { month: "short" });
      for (let day = 1; day <= daysInMonth; day++) {
        const start = new Date(y, m, day, 0, 0, 0, 0);
        const end = new Date(y, m, day, 23, 59, 59, 999);
        buckets.push({
          label: `${monthShort} ${day}`,
          date: start.toISOString(),
          start,
          end
        });
      }
    } else if (preset === "THIS_YEAR") {
      const y = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let m = 0; m < 12; m++) {
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        buckets.push({
          label: monthNames[m],
          date: start.toISOString(),
          start,
          end
        });
      }
    } else if (preset === "CUSTOM" && (startDateStr || endDateStr)) {
      const s = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
      s.setHours(0, 0, 0, 0);
      const e = endDateStr ? new Date(endDateStr) : new Date(now);
      e.setHours(23, 59, 59, 999);
      const diffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1e3 * 60 * 60 * 24)));
      if (diffDays <= 2) {
        const totalHours = diffDays * 24;
        const step = Math.max(3, Math.floor(totalHours / 6));
        for (let h = 0; h < totalHours; h += step) {
          const start = new Date(s.getTime() + h * 3600 * 1e3);
          const end = new Date(Math.min(e.getTime(), start.getTime() + step * 3600 * 1e3 - 1));
          const monthShort = start.toLocaleString("en-US", { month: "short" });
          buckets.push({
            label: `${monthShort} ${start.getDate()} ${start.getHours()}:00`,
            date: start.toISOString(),
            start,
            end
          });
        }
      } else if (diffDays <= 35) {
        for (let d = 0; d < diffDays; d++) {
          const start = new Date(s.getFullYear(), s.getMonth(), s.getDate() + d, 0, 0, 0, 0);
          const end = new Date(s.getFullYear(), s.getMonth(), s.getDate() + d, 23, 59, 59, 999);
          const monthShort = start.toLocaleString("en-US", { month: "short" });
          buckets.push({
            label: `${monthShort} ${start.getDate()}`,
            date: start.toISOString(),
            start,
            end
          });
        }
      } else {
        let cur = new Date(s.getFullYear(), s.getMonth(), 1);
        while (cur <= e) {
          const start = new Date(cur);
          const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
          const label = cur.toLocaleString("en-US", { month: "short", year: "2-digit" });
          buckets.push({
            label,
            date: start.toISOString(),
            start,
            end
          });
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
      }
    } else {
      const y = now.getFullYear();
      const m = now.getMonth();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(y, m - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
        buckets.push({
          label,
          date: start.toISOString(),
          start,
          end
        });
      }
    }
    const validApprovedTimestamps = approvedTenants.map((t) => new Date(t.approvedAt).getTime()).filter((ts) => !isNaN(ts)).sort((a, b) => a - b);
    let cumulative = 0;
    const firstBucketStart = buckets[0]?.start.getTime() || 0;
    const priorCount = validApprovedTimestamps.filter((ts) => ts < firstBucketStart).length;
    cumulative = priorCount;
    return buckets.map((b) => {
      const bStart = b.start.getTime();
      const bEnd = b.end.getTime();
      const count = validApprovedTimestamps.filter((ts) => ts >= bStart && ts <= bEnd).length;
      cumulative += count;
      return {
        label: b.label,
        date: b.date,
        count,
        cumulative
      };
    });
  }
  /**
   * Platform Analytics (Filtered by pharmacy approval date, subscription start date, and payment date)
   */
  static async getPlatformAnalytics(query) {
    const dateRange = _SuperAdminService.getDateRangeFilter(query?.datePreset, query?.startDate, query?.endDate);
    const approvedFilter = {
      name: { not: "Platform HQ" },
      ...dateRange ? { approvedAt: dateRange } : {
        OR: [
          { approvedAt: { not: null } },
          { verificationStatus: { in: ["APPROVED_PENDING_PAYMENT", "ACTIVE"] } }
        ]
      }
    };
    const subFilter = {
      tenant: { name: { not: "Platform HQ" } },
      ...dateRange ? { startDate: dateRange } : {}
    };
    const paymentFilter = {
      status: "VALIDATED",
      tenant: { name: { not: "Platform HQ" } },
      ...dateRange ? { createdAt: dateRange } : {}
    };
    const tenantFilter = {
      name: { not: "Platform HQ" },
      ...dateRange ? { createdAt: dateRange } : {}
    };
    const [
      newPharmacies,
      newSubscriptions,
      paymentsInRange,
      pendingReview,
      allApprovedTenants,
      subscriptionsInRange,
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSubscriptions,
      activeSubscriptions,
      activeSubsWithPlans,
      recentTenants
    ] = await Promise.all([
      prisma.tenant.count({ where: approvedFilter }),
      prisma.subscription.count({ where: subFilter }),
      prisma.payment.findMany({
        where: paymentFilter,
        select: { amount: true, createdAt: true }
      }),
      // 4. Pending Review: Current live status, independent of date filter
      prisma.tenant.count({
        where: { name: { not: "Platform HQ" }, verificationStatus: "PENDING_APPROVAL" }
      }),
      // For Pharmacy Growth Line Graph
      prisma.tenant.findMany({
        where: {
          name: { not: "Platform HQ" },
          OR: [
            { approvedAt: { not: null } },
            { verificationStatus: { in: ["APPROVED_PENDING_PAYMENT", "ACTIVE"] } }
          ]
        },
        select: { approvedAt: true, createdAt: true }
      }),
      // For Subscription by Plan Donut Chart
      prisma.subscription.findMany({
        where: subFilter,
        include: {
          plan: { select: { tier: true, name: true } },
          tenant: { select: { tier: true } }
        }
      }),
      prisma.tenant.count({ where: tenantFilter }),
      prisma.tenant.count({ where: { ...tenantFilter, isActive: true } }),
      prisma.tenant.count({ where: { ...tenantFilter, isActive: false } }),
      prisma.subscription.count({ where: subFilter }),
      prisma.subscription.count({ where: { ...subFilter, status: "ACTIVE" } }),
      prisma.subscription.findMany({
        where: { ...subFilter, status: "ACTIVE" },
        include: { plan: true, tenant: { select: { tier: true } } }
      }),
      prisma.tenant.findMany({
        where: tenantFilter,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { branches: true, users: true } } }
      })
    ]);
    const subscriptionRevenue = paymentsInRange.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const mappedApproved = allApprovedTenants.map((t) => ({
      approvedAt: t.approvedAt || t.createdAt
    }));
    const pharmacyGrowth = _SuperAdminService.generatePharmacyGrowthSeries(
      query?.datePreset,
      query?.startDate,
      query?.endDate,
      mappedApproved
    );
    let starterCount = 0;
    let growthCount = 0;
    let enterpriseCount = 0;
    for (const sub of subscriptionsInRange) {
      const tier = sub.plan?.tier || sub.tenant?.tier;
      if (tier === "STARTER") starterCount++;
      else if (tier === "GROWTH") growthCount++;
      else if (tier === "ENTERPRISE") enterpriseCount++;
    }
    const subTotal = starterCount + growthCount + enterpriseCount;
    const subscriptionByPlan = {
      starter: starterCount,
      growth: growthCount,
      enterprise: enterpriseCount,
      total: subTotal,
      breakdown: [
        {
          tier: "STARTER",
          name: "Starter",
          count: starterCount,
          percentage: subTotal > 0 ? Math.round(starterCount / subTotal * 100) : 0,
          color: "#3B82F6"
        },
        {
          tier: "GROWTH",
          name: "Growth",
          count: growthCount,
          percentage: subTotal > 0 ? Math.round(growthCount / subTotal * 100) : 0,
          color: "#10B981"
        },
        {
          tier: "ENTERPRISE",
          name: "Enterprise",
          count: enterpriseCount,
          percentage: subTotal > 0 ? Math.round(enterpriseCount / subTotal * 100) : 0,
          color: "#8B5CF6"
        }
      ]
    };
    const monthlyRecurringRevenue = activeSubsWithPlans.reduce((sum, s) => {
      const price = Number(s.plan?.price || 0);
      const isYearly = s.plan?.billingCycle === "YEARLY" || new Date(s.endDate).getTime() - new Date(s.startDate).getTime() > 45 * 24 * 60 * 60 * 1e3;
      return isYearly ? sum + price / 12 : sum + price;
    }, 0);
    return {
      // 4 Target Stat Cards
      newPharmacies,
      newSubscriptions,
      subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
      pendingReview,
      // 2 Target Charts
      pharmacyGrowth,
      subscriptionByPlan,
      // Preserved for legacy & analytics tab compatibility
      totalTenants,
      activeTenants,
      suspendedTenants,
      tierBreakdown: {
        starter: starterCount,
        growth: growthCount,
        enterprise: enterpriseCount
      },
      totalSubscriptions,
      activeSubscriptions,
      totalPlatformRevenue: Math.round(subscriptionRevenue * 100) / 100,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      recentTenants: recentTenants.map((t) => ({
        id: t.id,
        name: t.name,
        tier: t.tier,
        isActive: t.isActive,
        createdAt: t.createdAt,
        branchCount: t._count?.branches || 0,
        userCount: t._count?.users || 0
      }))
    };
  }
  /**
   * ==================== PLATFORM DYNAMIC ROLES & PERMISSIONS ====================
   */
  static async listRoles() {
    const roles = await prisma.platformRole.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      isSystem: r.isSystem,
      isActive: r.isActive !== false,
      userCount: r._count?.users || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }
  static async createRole(data) {
    const nameTrimmed = data.name.trim();
    if (!nameTrimmed) {
      throw new Error("Role name is required");
    }
    if (nameTrimmed.toUpperCase() === "SUPER_ADMIN" || nameTrimmed.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Cannot create a role with Super Admin name. Super Admin is root protected.");
    }
    const existing = await prisma.platformRole.findFirst({
      where: { name: { equals: nameTrimmed, mode: "insensitive" } }
    });
    if (existing) {
      throw new Error(`Role "${nameTrimmed}" already exists`);
    }
    const id = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return await prisma.platformRole.create({
      data: {
        id,
        name: nameTrimmed,
        description: data.description || null,
        permissions: data.permissions || [],
        isSystem: false,
        isActive: data.isActive !== void 0 ? data.isActive : true
      }
    });
  }
  static async updateRole(id, data) {
    const role = await prisma.platformRole.findUnique({ where: { id } });
    if (!role) {
      throw new Error("Role not found");
    }
    if (role.isSystem || role.name.toUpperCase() === "SUPER_ADMIN" || role.name.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Super Admin role is permanent and cannot be modified.");
    }
    const updateData = {};
    if (data.name !== void 0) {
      const nameTrimmed = data.name.trim();
      if (nameTrimmed.toUpperCase() === "SUPER_ADMIN" || nameTrimmed.toUpperCase() === "SUPER ADMIN") {
        throw new Error("Cannot rename role to Super Admin.");
      }
      updateData.name = nameTrimmed;
    }
    if (data.description !== void 0) {
      updateData.description = data.description;
    }
    if (data.permissions !== void 0) {
      updateData.permissions = data.permissions;
    }
    if (data.isActive !== void 0) {
      updateData.isActive = data.isActive;
    }
    return await prisma.platformRole.update({
      where: { id },
      data: updateData
    });
  }
  static async deleteRole(id) {
    const role = await prisma.platformRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } }
    });
    if (!role) {
      throw new Error("Role not found");
    }
    if (role.isSystem || role.name.toUpperCase() === "SUPER_ADMIN" || role.name.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Super Admin role is permanent and cannot be deleted.");
    }
    if (role._count?.users > 0) {
      throw new Error(`Cannot delete role "${role.name}" because ${role._count.users} staff member(s) are currently assigned to it. Please reassign their roles first.`);
    }
    await prisma.platformRole.delete({ where: { id } });
    return { success: true, message: `Role "${role.name}" removed successfully` };
  }
  static async batchUpdateRolePermissions(matrix) {
    const updatedRoles = [];
    for (const item of matrix) {
      const role = await prisma.platformRole.findUnique({
        where: { id: item.roleId }
      });
      if (role && !role.isSystem && role.name.toUpperCase() !== "SUPER_ADMIN") {
        const updated = await prisma.platformRole.update({
          where: { id: item.roleId },
          data: { permissions: item.permissions }
        });
        updatedRoles.push(updated);
      }
    }
    return updatedRoles;
  }
  /**
   * ==================== PLATFORM STAFF MANAGEMENT ====================
   */
  static async listPlatformStaff() {
    let systemTenant = await prisma.tenant.findFirst({
      where: { name: "Platform HQ" }
    });
    const whereClause = systemTenant ? {
      OR: [
        { tenantId: systemTenant.id },
        { role: "SUPER_ADMIN" },
        { customRoleId: { not: null } },
        { role: { in: ["CTO", "PROJECT_MANAGER"] } }
      ]
    } : {
      OR: [
        { role: "SUPER_ADMIN" },
        { customRoleId: { not: null } },
        { role: { in: ["CTO", "PROJECT_MANAGER"] } }
      ]
    };
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      include: {
        customRole: true
      }
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      phone: u.phone,
      role: u.role,
      customRoleId: u.customRoleId,
      customRoleName: u.customRole?.name || u.customRoleName || (u.role === "SUPER_ADMIN" ? "Super Admin" : u.role),
      customRole: u.customRole,
      permissions: u.role === "SUPER_ADMIN" ? ["*"] : u.permissions?.length ? u.permissions : u.customRole?.permissions || [],
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
  }
  static async createPlatformStaff(creatorId, creatorRole, data) {
    if (creatorRole !== "SUPER_ADMIN") {
      throw new Error("Only Super Admin can create new platform staff members.");
    }
    if (data.role === "SUPER_ADMIN" || data.role?.toUpperCase() === "SUPER_ADMIN") {
      throw new Error("Cannot create additional Super Admin root accounts. Please assign a custom role.");
    }
    let systemTenant = await prisma.tenant.findFirst({
      where: { name: "Platform HQ" }
    });
    if (!systemTenant) {
      systemTenant = await prisma.tenant.create({
        data: {
          name: "Platform HQ",
          tier: "ENTERPRISE",
          email: "admin@platform.system",
          phone: "01700000000",
          address: "Platform Control Center",
          isActive: true
        }
      });
    }
    const identifier = (data.username || data.email || "").trim();
    if (!identifier) {
      throw new Error("Email or username is required");
    }
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username || data.email }
        ]
      }
    });
    if (existingUser) {
      throw new Error("A user with this email or username already exists");
    }
    let matchedRole = null;
    if (data.role) {
      matchedRole = await prisma.platformRole.findFirst({
        where: {
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } }
          ]
        }
      });
    }
    if (!matchedRole && data.role) {
      const roleName = data.role.trim();
      const roleId = roleName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      matchedRole = await prisma.platformRole.create({
        data: {
          id: roleId,
          name: roleName,
          description: `Custom ${roleName} platform role`,
          permissions: data.permissions || [],
          isSystem: false
        }
      });
    }
    const assignedPermissions = Array.isArray(data.permissions) && data.permissions.length > 0 ? data.permissions : matchedRole?.permissions || [];
    const bcrypt4 = __require("bcryptjs");
    const passwordHash = await bcrypt4.hash(data.password, 10);
    const enumRole = matchedRole?.name === "CTO" ? "CTO" : matchedRole?.name === "Project Manager" ? "PROJECT_MANAGER" : "PROJECT_MANAGER";
    const staff = await prisma.user.create({
      data: {
        tenantId: systemTenant.id,
        name: data.name,
        email: data.email,
        username: data.username || data.email,
        phone: data.phone || null,
        passwordHash,
        role: enumRole,
        customRoleId: matchedRole?.id || null,
        customRoleName: matchedRole?.name || data.role,
        permissions: assignedPermissions,
        isActive: true
      },
      include: {
        customRole: true
      }
    });
    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      username: staff.username,
      phone: staff.phone,
      role: staff.role,
      customRoleId: staff.customRoleId,
      customRoleName: staff.customRole?.name || staff.customRoleName,
      permissions: staff.permissions,
      isActive: staff.isActive,
      createdAt: staff.createdAt
    };
  }
  static async updatePlatformStaff(id, updaterId, updaterRole, data) {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { customRole: true }
    });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }
    if (targetUser.role === "SUPER_ADMIN") {
      if (updaterRole !== "SUPER_ADMIN") {
        throw new Error("Delegated staff cannot modify or alter the Super Admin master account.");
      }
      if (data.role && data.role !== "SUPER_ADMIN") {
        throw new Error("Cannot change Super Admin role.");
      }
      if (data.isActive === false) {
        throw new Error("Super Admin master account cannot be deactivated.");
      }
    }
    if (updaterRole !== "SUPER_ADMIN" && (data.role === "SUPER_ADMIN" || data.customRoleName === "SUPER_ADMIN")) {
      throw new Error("Delegated platform staff cannot promote accounts to Super Admin.");
    }
    let customRoleId = targetUser.customRoleId;
    let customRoleName = targetUser.customRoleName;
    if (data.role && targetUser.role !== "SUPER_ADMIN") {
      let matchedRole = await prisma.platformRole.findFirst({
        where: {
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } }
          ]
        }
      });
      if (matchedRole) {
        customRoleId = matchedRole.id;
        customRoleName = matchedRole.name;
      } else {
        customRoleName = data.role;
      }
    }
    const updateData = {
      ...data.name !== void 0 && { name: data.name },
      ...data.email !== void 0 && { email: data.email },
      ...data.phone !== void 0 && { phone: data.phone },
      ...data.permissions !== void 0 && { permissions: data.permissions },
      ...customRoleId !== void 0 && { customRoleId },
      ...customRoleName !== void 0 && { customRoleName },
      ...data.isActive !== void 0 && { isActive: data.isActive }
    };
    if (data.password) {
      const bcrypt4 = __require("bcryptjs");
      updateData.passwordHash = await bcrypt4.hash(data.password, 10);
    }
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        customRole: true
      }
    });
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      phone: updated.phone,
      role: updated.role,
      customRoleId: updated.customRoleId,
      customRoleName: updated.customRole?.name || updated.customRoleName,
      permissions: updated.role === "SUPER_ADMIN" ? ["*"] : updated.permissions,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt
    };
  }
  static async updatePlatformStaffStatus(id, updaterId, updaterRole, isActive) {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }
    if (targetUser.role === "SUPER_ADMIN") {
      throw new Error("Super Admin master account cannot be deactivated or disabled.");
    }
    if (targetUser.id === updaterId && !isActive) {
      throw new Error("You cannot deactivate your own staff account.");
    }
    return await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true
      }
    });
  }
  static async deletePlatformStaff(id, updaterId, updaterRole) {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }
    if (targetUser.role === "SUPER_ADMIN") {
      throw new Error("Super Admin master account cannot be deleted or removed under any circumstance.");
    }
    if (targetUser.id === updaterId) {
      throw new Error("You cannot delete your own staff account.");
    }
    await prisma.user.delete({ where: { id } });
    return { success: true, message: `Platform staff account ${targetUser.username} removed.` };
  }
  static async getPlatformPermissionsHierarchy() {
    const roles = await this.listRoles();
    const availablePermissions = [
      {
        id: "pharmacies.manage",
        name: "Manage Pharmacies",
        category: "Pharmacies & Tenants",
        description: "View, inspect, activate, and suspend pharmacy tenant accounts."
      },
      {
        id: "subscriptions.manage",
        name: "Manage Subscriptions",
        category: "Subscriptions & Billing",
        description: "Manage tenant subscription lifecycle, renewals, and statuses."
      },
      {
        id: "plans.manage",
        name: "Manage Plans",
        category: "Subscriptions & Billing",
        description: "Create, configure, update, and manage pricing tiers and feature limits."
      },
      {
        id: "payments.view",
        name: "View Payments",
        category: "Subscriptions & Billing",
        description: "Inspect revenue transactions, payment statuses, and invoice records."
      },
      {
        id: "reports.view",
        name: "View Reports",
        category: "Analytics & Telemetry",
        description: "Access platform MRR, revenue growth analytics, and tenant reports."
      },
      {
        id: "staff.create",
        name: "Create Staff",
        category: "Staff & Access Control",
        description: "Create new platform staff members and assign roles and permissions."
      },
      {
        id: "staff.manage",
        name: "Manage Staff",
        category: "Staff & Access Control",
        description: "Edit staff profiles, update permission matrix, toggle status, and delete staff."
      },
      {
        id: "roles.manage",
        name: "Manage Roles & Permissions",
        category: "Staff & Access Control",
        description: "Create dynamic custom roles, edit permissions, and manage role assignments."
      },
      {
        id: "settings.manage",
        name: "Manage System Settings",
        category: "Platform Administration",
        description: "Configure platform branding, landing page content, and global settings."
      },
      {
        id: "platform.data",
        name: "Manage Platform Data",
        category: "Platform Administration",
        description: "Access system telemetry, audit logs, and platform diagnostic data."
      }
    ];
    return {
      roles,
      availablePermissions
    };
  }
  static async updatePlatformRolePermissions(roleIdentifier, permissions) {
    let role = await prisma.platformRole.findFirst({
      where: {
        OR: [
          { id: roleIdentifier },
          { name: { equals: roleIdentifier, mode: "insensitive" } }
        ]
      }
    });
    if (!role) {
      throw new Error(`Role "${roleIdentifier}" not found.`);
    }
    const updated = await prisma.platformRole.update({
      where: { id: role.id },
      data: { permissions }
    });
    return { success: true, role: updated.name, permissions: updated.permissions };
  }
  /**
   * List Pharmacy Verification Applications with filtering & metrics
   */
  static async listPharmacyVerifications(query) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;
    const where = {
      name: { not: "Platform HQ" }
    };
    if (query?.status && query.status !== "ALL") {
      where.verificationStatus = query.status;
    }
    const dateRange = _SuperAdminService.getDateRangeFilter(query?.datePreset, query?.startDate, query?.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }
    if (query?.search) {
      const search = query.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { nidNumber: { contains: search, mode: "insensitive" } },
            { tradeLicenseNumber: { contains: search, mode: "insensitive" } },
            { drugLicenseNumber: { contains: search, mode: "insensitive" } },
            { users: { some: { name: { contains: search, mode: "insensitive" }, role: "COMPANY_OWNER" } } }
          ]
        }
      ];
    }
    const baseMetricWhere = {
      name: { not: "Platform HQ" }
    };
    if (dateRange) {
      baseMetricWhere.createdAt = dateRange;
    }
    const [tenants, total, pendingCount, approvedCount, rejectedCount, activeCount, totalMetricsCount] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          users: {
            where: { role: "COMPANY_OWNER" },
            select: { id: true, name: true, email: true, phone: true, username: true, createdAt: true },
            take: 1
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true }
          }
        }
      }),
      prisma.tenant.count({ where }),
      prisma.tenant.count({ where: { ...baseMetricWhere, verificationStatus: "PENDING_APPROVAL" } }),
      prisma.tenant.count({ where: { ...baseMetricWhere, verificationStatus: "APPROVED_PENDING_PAYMENT" } }),
      prisma.tenant.count({ where: { ...baseMetricWhere, verificationStatus: "REJECTED" } }),
      prisma.tenant.count({ where: { ...baseMetricWhere, verificationStatus: "ACTIVE" } }),
      prisma.tenant.count({ where: baseMetricWhere })
    ]);
    const formatted = tenants.map((t) => {
      const owner = t.users?.[0] || null;
      const latestSub = t.subscriptions?.[0] || null;
      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        address: t.address,
        tier: t.tier,
        isActive: t.isActive,
        verificationStatus: t.verificationStatus,
        nidNumber: t.nidNumber,
        nidDocUrl: t.nidDocUrl,
        nidFrontUrl: t.nidFrontUrl || t.nidDocUrl,
        nidBackUrl: t.nidBackUrl,
        tradeLicenseNumber: t.tradeLicenseNumber,
        tradeLicenseDocUrl: t.tradeLicenseDocUrl,
        tradeLicenseFrontUrl: t.tradeLicenseFrontUrl || t.tradeLicenseDocUrl,
        tradeLicenseBackUrl: t.tradeLicenseBackUrl,
        drugLicenseNumber: t.drugLicenseNumber,
        drugLicenseDocUrl: t.drugLicenseDocUrl,
        drugLicenseFrontUrl: t.drugLicenseFrontUrl || t.drugLicenseDocUrl,
        drugLicenseBackUrl: t.drugLicenseBackUrl,
        otpVerifiedAt: t.otpVerifiedAt,
        approvedAt: t.approvedAt,
        approvedBy: t.approvedBy,
        approvalNotes: t.approvalNotes,
        rejectedAt: t.rejectedAt,
        rejectedBy: t.rejectedBy,
        rejectionReason: t.rejectionReason,
        pendingPlanId: t.pendingPlanId,
        pendingBillingCycle: t.pendingBillingCycle,
        createdAt: t.createdAt,
        owner,
        subscription: latestSub
      };
    });
    return {
      data: formatted,
      metrics: {
        total: totalMetricsCount,
        pendingReview: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        active: activeCount
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Get single pharmacy verification application details
   */
  static async getPharmacyVerification(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: "COMPANY_OWNER" },
          take: 1
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true, payments: true }
        }
      }
    });
    if (!tenant) {
      throw new Error("Pharmacy application record not found.");
    }
    return tenant;
  }
  /**
   * Approve pharmacy application and dispatch approval email with payment checkout URL
   */
  static async approvePharmacyVerification(id, adminUserId, data) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: "COMPANY_OWNER" }, take: 1 },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } }
      }
    });
    if (!tenant) {
      throw new Error("Pharmacy application not found.");
    }
    const owner = tenant.users?.[0];
    if (!owner) {
      throw new Error("Owner user not found for this pharmacy application.");
    }
    let planId = data?.planId || tenant.pendingPlanId || tenant.subscriptions?.[0]?.planId;
    let plan = planId ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } }) : null;
    if (!plan) {
      plan = await prisma.subscriptionPlan.findFirst({ where: { tier: "STARTER" } }) || await prisma.subscriptionPlan.findFirst();
    }
    const billingCycle = data?.billingCycle || tenant.pendingBillingCycle || "MONTHLY";
    const durationDays = billingCycle === "YEARLY" ? 365 : 30;
    const startDate = /* @__PURE__ */ new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
    const basePrice = Number(plan.price);
    const amount = billingCycle === "YEARLY" ? Math.round(basePrice * 12 * 0.85) : basePrice;
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        verificationStatus: "APPROVED_PENDING_PAYMENT",
        approvedAt: /* @__PURE__ */ new Date(),
        approvedBy: adminUserId,
        approvalNotes: data?.notes || "Approved by Super Admin",
        pendingPlanId: plan.id,
        pendingBillingCycle: billingCycle,
        tier: plan.tier
      }
    });
    let subscription = tenant.subscriptions?.[0];
    if (subscription) {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: plan.id,
          status: "PENDING",
          startDate,
          endDate
        },
        include: { plan: true }
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "PENDING",
          startDate,
          endDate
        },
        include: { plan: true }
      });
    }
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
    const paymentUrl = `${clientUrl}/verification-status?tenantId=${tenant.id}&email=${encodeURIComponent(owner.email || tenant.email || "")}`;
    const emailRecipient = owner.email || tenant.email;
    if (emailRecipient) {
      await EmailService.sendApprovalEmail({
        to: emailRecipient,
        name: owner.name || tenant.name,
        companyName: tenant.name,
        planName: plan.name,
        planTier: plan.tier,
        billingCycle,
        price: amount,
        paymentUrl
      });
    }
    return {
      success: true,
      message: `Pharmacy "${tenant.name}" application approved. Approval email with payment instructions dispatched to ${emailRecipient}.`,
      tenant: updatedTenant,
      subscription,
      paymentUrl
    };
  }
  /**
   * Reject pharmacy application with reason and notify applicant
   */
  static async rejectPharmacyVerification(id, adminUserId, data) {
    if (!data.reason || !data.reason.trim()) {
      throw new Error("A clear rejection reason is required.");
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { where: { role: "COMPANY_OWNER" }, take: 1 }
      }
    });
    if (!tenant) {
      throw new Error("Pharmacy application not found.");
    }
    const owner = tenant.users?.[0];
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        verificationStatus: "REJECTED",
        rejectedAt: /* @__PURE__ */ new Date(),
        rejectedBy: adminUserId,
        rejectionReason: data.reason.trim(),
        isActive: false
      }
    });
    const emailRecipient = owner?.email || tenant.email;
    if (emailRecipient) {
      await EmailService.sendRejectionEmail({
        to: emailRecipient,
        name: owner?.name || tenant.name,
        companyName: tenant.name,
        reason: data.reason.trim()
      });
    }
    return {
      success: true,
      message: `Pharmacy application rejected and notification sent to ${emailRecipient}.`,
      tenant: updatedTenant
    };
  }
};

// src/modules/super-admin/super-admin.controller.ts
var SuperAdminController = class {
  // Plans
  static async createPlan(req, res) {
    try {
      const plan = await SuperAdminService.createPlan(req.body);
      res.status(201).json({
        success: true,
        message: "Subscription plan created successfully",
        data: plan
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listPlans(req, res) {
    try {
      const plans = await SuperAdminService.listPlans();
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getPlanById(req, res) {
    try {
      const id = req.params.id;
      const plan = await SuperAdminService.getPlanById(id);
      res.status(200).json({ success: true, data: plan });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async updatePlan(req, res) {
    try {
      const id = req.params.id;
      const updated = await SuperAdminService.updatePlan(id, req.body);
      res.status(200).json({
        success: true,
        message: "Subscription plan updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deletePlan(req, res) {
    try {
      const id = req.params.id;
      const result = await SuperAdminService.deletePlan(id);
      res.status(200).json({
        success: true,
        message: "Subscription plan deactivated or removed successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  // Tenants
  static async listTenants(req, res) {
    try {
      const query = req.query;
      const result = await SuperAdminService.listTenants(query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getTenantDetails(req, res) {
    try {
      const id = req.params.id;
      const tenant = await SuperAdminService.getTenantDetails(id);
      res.status(200).json({ success: true, data: tenant });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async getTenantSubscription(req, res) {
    try {
      const id = req.params.id;
      const subscriptions = await SuperAdminService.getTenantSubscription(id);
      res.status(200).json({ success: true, data: subscriptions });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async updateTenantStatus(req, res) {
    try {
      const id = req.params.id;
      const { isActive } = req.body;
      const updated = await SuperAdminService.updateTenantStatus(id, isActive);
      res.status(200).json({
        success: true,
        message: `Tenant has been ${isActive ? "activated" : "suspended"} successfully`,
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  // Subscriptions
  static async listSubscriptions(req, res) {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const status = req.query.status;
      const datePreset = req.query.datePreset;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      const tier = req.query.tier;
      const search = req.query.search;
      const result = await SuperAdminService.listSubscriptions(page, limit, status, { datePreset, startDate, endDate, tier, search });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // Payments
  static async listPayments(req, res) {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const result = await SuperAdminService.listPlatformPayments(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // Analytics
  static async getAnalytics(req, res) {
    try {
      const datePreset = req.query.datePreset;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      const analytics = await SuperAdminService.getPlatformAnalytics({ datePreset, startDate, endDate });
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // ==================== PLATFORM DYNAMIC ROLES ====================
  static async listRoles(req, res) {
    try {
      const roles = await SuperAdminService.listRoles();
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async createRole(req, res) {
    try {
      const role = await SuperAdminService.createRole(req.body);
      res.status(201).json({
        success: true,
        message: `Custom role "${role.name}" created successfully`,
        data: role
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateRole(req, res) {
    try {
      const id = req.params.id;
      const updated = await SuperAdminService.updateRole(id, req.body);
      res.status(200).json({
        success: true,
        message: `Role "${updated.name}" updated successfully`,
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteRole(req, res) {
    try {
      const id = req.params.id;
      const result = await SuperAdminService.deleteRole(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async batchUpdateRolePermissions(req, res) {
    try {
      const { matrix } = req.body;
      const result = await SuperAdminService.batchUpdateRolePermissions(matrix);
      res.status(200).json({
        success: true,
        message: "Platform role permissions saved successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  // ==================== PLATFORM STAFF ====================
  static async listPlatformStaff(req, res) {
    try {
      const staff = await SuperAdminService.listPlatformStaff();
      res.status(200).json({ success: true, data: staff });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async createPlatformStaff(req, res) {
    try {
      const creatorId = req.user.id;
      const creatorRole = req.user.role;
      const staff = await SuperAdminService.createPlatformStaff(creatorId, creatorRole, req.body);
      res.status(201).json({
        success: true,
        message: `Platform staff member "${staff.name}" (${staff.customRoleName || staff.role}) created successfully`,
        data: staff
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updatePlatformStaff(req, res) {
    try {
      const id = req.params.id;
      const updaterId = req.user.id;
      const updaterRole = req.user.role;
      const updated = await SuperAdminService.updatePlatformStaff(id, updaterId, updaterRole, req.body);
      res.status(200).json({
        success: true,
        message: "Platform staff member updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updatePlatformStaffStatus(req, res) {
    try {
      const id = req.params.id;
      const updaterId = req.user.id;
      const updaterRole = req.user.role;
      const { isActive } = req.body;
      const updated = await SuperAdminService.updatePlatformStaffStatus(id, updaterId, updaterRole, isActive);
      res.status(200).json({
        success: true,
        message: `Platform staff member ${isActive ? "activated" : "deactivated"} successfully`,
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deletePlatformStaff(req, res) {
    try {
      const id = req.params.id;
      const updaterId = req.user.id;
      const updaterRole = req.user.role;
      const result = await SuperAdminService.deletePlatformStaff(id, updaterId, updaterRole);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getPlatformPermissions(req, res) {
    try {
      const hierarchy = await SuperAdminService.getPlatformPermissionsHierarchy();
      res.status(200).json({ success: true, data: hierarchy });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async updatePlatformPermissions(req, res) {
    try {
      const { role, permissions } = req.body;
      const result = await SuperAdminService.updatePlatformRolePermissions(role, permissions);
      res.status(200).json({
        success: true,
        message: `Platform permissions for ${role} updated successfully`,
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * GET /api/super-admin/verifications
   */
  static async listPharmacyVerifications(req, res) {
    try {
      const { status, search, page, limit, datePreset, startDate, endDate } = req.query;
      const result = await SuperAdminService.listPharmacyVerifications({
        status,
        search,
        page: page ? parseInt(page) : void 0,
        limit: limit ? parseInt(limit) : void 0,
        datePreset,
        startDate,
        endDate
      });
      res.status(200).json({
        success: true,
        data: result.data,
        metrics: result.metrics,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  /**
   * GET /api/super-admin/verifications/:id
   */
  static async getPharmacyVerification(req, res) {
    try {
      const id = req.params.id;
      const result = await SuperAdminService.getPharmacyVerification(id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * POST /api/super-admin/verifications/:id/approve
   */
  static async approvePharmacyVerification(req, res) {
    try {
      const id = req.params.id;
      const adminUserId = req.user.id;
      const result = await SuperAdminService.approvePharmacyVerification(id, adminUserId, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * POST /api/super-admin/verifications/:id/reject
   */
  static async rejectPharmacyVerification(req, res) {
    try {
      const id = req.params.id;
      const adminUserId = req.user.id;
      const result = await SuperAdminService.rejectPharmacyVerification(id, adminUserId, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/middleware/validate.ts
import { ZodError } from "zod";
var validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        Object.defineProperty(req, "params", {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.issues.map((err) => `${err.path.join(".") || "root"}: ${err.message}`).join("; ");
        res.status(400).json({
          success: false,
          message: errorDetails ? `Validation error: ${errorDetails}` : "Validation error",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message
          }))
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: "Invalid request payload"
      });
    }
  };
};

// src/modules/super-admin/super-admin.validation.ts
import { z as z2 } from "zod";
var createPlanSchema = z2.object({
  name: z2.string().min(2, "Plan name must be at least 2 characters"),
  tier: z2.enum(["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]),
  price: z2.number().nonnegative("Price must be greater than or equal to 0"),
  billingCycle: z2.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  maxBranches: z2.number().int().positive("Max branches must be at least 1"),
  features: z2.record(z2.string(), z2.any()).optional(),
  isActive: z2.boolean().default(true)
});
var updatePlanSchema = z2.object({
  name: z2.string().min(2).optional(),
  price: z2.number().nonnegative().optional(),
  billingCycle: z2.enum(["MONTHLY", "YEARLY"]).optional(),
  maxBranches: z2.number().int().positive().optional(),
  features: z2.record(z2.string(), z2.any()).optional(),
  isActive: z2.boolean().optional()
});
var updateTenantStatusSchema = z2.object({
  isActive: z2.boolean(),
  reason: z2.string().optional()
});
var listTenantsQuerySchema = z2.object({
  page: z2.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z2.string().optional().transform((v) => v ? parseInt(v, 10) : 100),
  search: z2.string().optional(),
  tier: z2.enum(["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]).optional(),
  isActive: z2.string().optional().transform((v) => v === "true" ? true : v === "false" ? false : void 0),
  datePreset: z2.string().optional(),
  startDate: z2.string().optional(),
  endDate: z2.string().optional()
});
var createRoleSchema = z2.object({
  name: z2.string().min(1, "Role name is required"),
  description: z2.string().optional(),
  permissions: z2.array(z2.string()).default([]),
  isActive: z2.boolean().default(true)
});
var updateRoleSchema = z2.object({
  name: z2.string().min(1, "Role name is required").optional(),
  description: z2.string().optional(),
  permissions: z2.array(z2.string()).optional(),
  isActive: z2.boolean().optional()
});
var batchUpdatePlatformRolePermissionsSchema = z2.object({
  matrix: z2.array(
    z2.object({
      roleId: z2.string(),
      permissions: z2.array(z2.string())
    })
  )
});
var createPlatformStaffSchema = z2.object({
  name: z2.string().min(2, "Name must be at least 2 characters"),
  email: z2.string().email("Invalid email format"),
  username: z2.string().min(3, "Username must be at least 3 characters").optional(),
  phone: z2.string().optional(),
  password: z2.string().min(6, "Password must be at least 6 characters"),
  role: z2.string().min(2, "Role is required"),
  permissions: z2.array(z2.string()).default([])
});
var updatePlatformStaffSchema = z2.object({
  name: z2.string().min(2).optional(),
  email: z2.string().email().optional(),
  phone: z2.string().optional(),
  password: z2.string().min(6).optional(),
  role: z2.string().min(2).optional(),
  permissions: z2.array(z2.string()).optional(),
  isActive: z2.boolean().optional()
});
var updatePlatformRolePermissionsSchema = z2.object({
  role: z2.string().min(2),
  permissions: z2.array(z2.string())
});

// src/modules/super-admin/super-admin.routes.ts
var router2 = Router2();
router2.use(authenticate);
router2.get("/plans", requirePermission("plans.manage"), SuperAdminController.listPlans);
router2.post("/plans", requirePermission("plans.manage"), validateRequest({ body: createPlanSchema }), SuperAdminController.createPlan);
router2.get("/plans/:id", requirePermission("plans.manage"), SuperAdminController.getPlanById);
router2.patch("/plans/:id", requirePermission("plans.manage"), validateRequest({ body: updatePlanSchema }), SuperAdminController.updatePlan);
router2.delete("/plans/:id", requirePermission("plans.manage"), SuperAdminController.deletePlan);
router2.get("/tenants", requirePermission("pharmacies.manage"), validateRequest({ query: listTenantsQuerySchema }), SuperAdminController.listTenants);
router2.get("/tenants/:id", requirePermission("pharmacies.manage"), SuperAdminController.getTenantDetails);
router2.get("/tenants/:id/subscription", requirePermission("pharmacies.manage"), SuperAdminController.getTenantSubscription);
router2.patch(
  "/tenants/:id/status",
  requirePermission("pharmacies.manage"),
  validateRequest({ body: updateTenantStatusSchema }),
  SuperAdminController.updateTenantStatus
);
router2.get("/verifications", requirePermission("pharmacies.manage"), SuperAdminController.listPharmacyVerifications);
router2.get("/verifications/:id", requirePermission("pharmacies.manage"), SuperAdminController.getPharmacyVerification);
router2.post("/verifications/:id/approve", requirePermission("pharmacies.manage"), SuperAdminController.approvePharmacyVerification);
router2.post("/verifications/:id/reject", requirePermission("pharmacies.manage"), SuperAdminController.rejectPharmacyVerification);
router2.get("/subscriptions", requirePermission("subscriptions.manage"), SuperAdminController.listSubscriptions);
router2.get("/payments", requirePermission("payments.view"), SuperAdminController.listPayments);
router2.get("/analytics", requirePermission("reports.view"), SuperAdminController.getAnalytics);
router2.get("/roles", requirePermission("roles.manage"), SuperAdminController.listRoles);
router2.post("/roles", requirePermission("roles.manage"), validateRequest({ body: createRoleSchema }), SuperAdminController.createRole);
router2.post(
  "/roles/matrix",
  requirePermission("roles.manage"),
  validateRequest({ body: batchUpdatePlatformRolePermissionsSchema }),
  SuperAdminController.batchUpdateRolePermissions
);
router2.patch("/roles/:id", requirePermission("roles.manage"), validateRequest({ body: updateRoleSchema }), SuperAdminController.updateRole);
router2.delete("/roles/:id", requirePermission("roles.manage"), SuperAdminController.deleteRole);
router2.get(
  "/staff",
  requirePermission("staff.manage"),
  SuperAdminController.listPlatformStaff
);
router2.post(
  "/staff",
  requirePermission("staff.create"),
  validateRequest({ body: createPlatformStaffSchema }),
  SuperAdminController.createPlatformStaff
);
router2.patch(
  "/staff/:id",
  requirePermission("staff.manage"),
  validateRequest({ body: updatePlatformStaffSchema }),
  SuperAdminController.updatePlatformStaff
);
router2.patch(
  "/staff/:id/status",
  requirePermission("staff.manage"),
  SuperAdminController.updatePlatformStaffStatus
);
router2.delete(
  "/staff/:id",
  requirePermission("staff.manage"),
  SuperAdminController.deletePlatformStaff
);
router2.get(
  "/staff/permissions",
  SuperAdminController.getPlatformPermissions
);
router2.post(
  "/staff/permissions",
  requirePermission("roles.manage"),
  validateRequest({ body: updatePlatformRolePermissionsSchema }),
  SuperAdminController.updatePlatformPermissions
);

// src/modules/subscription/subscription.routes.ts
import { Router as Router3 } from "express";

// src/modules/subscription/subscription.service.ts
var SubscriptionService = class {
  /**
   * List all available plans
   */
  static async listAvailablePlans() {
    return await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    });
  }
  static async getPlanDetails(planId) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
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
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: { where: { isActive: true } },
        users: { where: { isActive: true } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
          take: 1
        }
      }
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const currentSub = tenant.subscriptions && tenant.subscriptions[0];
    const tier = currentSub?.plan?.tier || tenant.tier || "TRIAL";
    const planConfig = getPlanConfig(tier);
    const isTrial = tier === "TRIAL";
    const isExpired = currentSub ? isSubscriptionExpired(currentSub) : true;
    const trialDaysRemaining = isTrial && currentSub?.endDate ? getTrialRemainingDays(currentSub.endDate) : 0;
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
        remainingStaff: Math.max(0, maxStaff - staffCount)
      },
      features: {
        interBranchTransfer: tier !== "STARTER" && tier !== "TRIAL",
        regionalAdmin: tier !== "STARTER" && tier !== "TRIAL",
        customAudit: tier === "ENTERPRISE",
        apiAccess: tier === "ENTERPRISE",
        branchPriceOverride: tier !== "STARTER" && tier !== "TRIAL"
      }
    };
  }
  /**
   * Get tenant subscription history
   */
  static async getSubscriptionHistory(tenantId) {
    return await prisma.subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  }
  /**
   * Create or Select a plan (Pending state until payment validated)
   */
  static async createSubscription(tenantId, data) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId }
    });
    if (!plan || !plan.isActive) {
      throw new Error("Invalid or inactive subscription plan");
    }
    const durationDays = data.billingCycle === "YEARLY" ? 365 : 30;
    const startDate = /* @__PURE__ */ new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status: "PENDING",
        startDate,
        endDate,
        autoRenew: data.autoRenew
      },
      include: { plan: true }
    });
    return subscription;
  }
  /**
   * Change or Upgrade/Downgrade Plan (from Trial or previous plan)
   */
  static async changePlan(tenantId, data) {
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.newPlanId }
    });
    if (!newPlan || !newPlan.isActive) {
      throw new Error("Target subscription plan not found or inactive");
    }
    const activeBranches = await prisma.branch.count({
      where: { tenantId, isActive: true }
    });
    if (activeBranches > newPlan.maxBranches) {
      throw new Error(
        `Cannot change to ${newPlan.name}. You currently have ${activeBranches} active branches, but this plan allows at most ${newPlan.maxBranches}. Please deactivate extra branches first.`
      );
    }
    const startDate = /* @__PURE__ */ new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1e3);
    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId: newPlan.id,
        status: "PENDING",
        startDate,
        endDate
      },
      include: { plan: true }
    });
    return subscription;
  }
  /**
   * Renew Subscription
   */
  static async renewSubscription(tenantId) {
    const currentSub = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true }
    });
    if (!currentSub) {
      throw new Error("No existing subscription found to renew");
    }
    const durationDays = currentSub.plan.billingCycle === "YEARLY" ? 365 : 30;
    const baseDate = new Date(currentSub.endDate) > /* @__PURE__ */ new Date() ? new Date(currentSub.endDate) : /* @__PURE__ */ new Date();
    const newEndDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1e3);
    const newSub = await prisma.subscription.create({
      data: {
        tenantId,
        planId: currentSub.planId,
        status: "PENDING",
        startDate: baseDate,
        endDate: newEndDate,
        autoRenew: currentSub.autoRenew
      },
      include: { plan: true }
    });
    return newSub;
  }
  /**
   * Cancel Subscription
   */
  static async cancelSubscription(tenantId) {
    const currentSub = await prisma.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" }
    });
    if (!currentSub) {
      throw new Error("No active subscription found to cancel");
    }
    const updated = await prisma.subscription.update({
      where: { id: currentSub.id },
      data: {
        status: "CANCELLED",
        autoRenew: false
      }
    });
    return updated;
  }
};

// src/modules/subscription/subscription-expiry.service.ts
var SubscriptionExpiryService = class {
  /**
   * Automated service method to scan active subscriptions expiring in 2 days,
   * send dynamic HTML reminder emails to pharmacy owners, create in-app alerts,
   * and mark expiryReminderSentAt to guarantee single dispatch.
   */
  static async checkAndSendExpiryReminders() {
    console.log(`
\u{1F50D} [EXPIRY SCHEDULER] Running automated subscription expiry scan...`);
    let sentCount = 0;
    let errorsCount = 0;
    try {
      const now = /* @__PURE__ */ new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1e3);
      const expiringSubscriptions = await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          expiryReminderSentAt: null,
          endDate: {
            gte: now,
            lte: twoDaysFromNow
          }
        },
        include: {
          plan: true,
          tenant: {
            include: {
              users: {
                where: { role: "COMPANY_OWNER" },
                take: 1
              }
            }
          }
        }
      });
      console.log(`\u2139\uFE0F [EXPIRY SCHEDULER] Found ${expiringSubscriptions.length} subscription(s) expiring within 2 days awaiting reminders.`);
      const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
      const renewUrl = `${clientUrl}/dashboard?tab=subscription`;
      for (const sub of expiringSubscriptions) {
        try {
          const tenant = sub.tenant;
          const plan = sub.plan;
          const ownerUser = tenant?.users?.[0];
          const recipientEmail = (ownerUser?.email || tenant?.email || "").trim();
          const recipientName = ownerUser?.name || tenant?.name || "Pharmacy Owner";
          const companyName = tenant?.name || "Pharmacy";
          const planName = plan?.name || "Subscription Plan";
          const planTier = plan?.tier || tenant?.tier || "STARTER";
          if (!recipientEmail || !recipientEmail.includes("@")) {
            console.warn(`\u26A0\uFE0F [EXPIRY SCHEDULER] Skipping sub #${sub.id}: No valid email found for tenant ${companyName}`);
            continue;
          }
          const emailRes = await EmailService.sendSubscriptionExpiryReminderEmail({
            to: recipientEmail,
            name: recipientName,
            companyName,
            planName,
            planTier,
            expiryDate: sub.endDate,
            renewUrl
          });
          if (emailRes.success) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { expiryReminderSentAt: /* @__PURE__ */ new Date() }
            });
            await prisma.notification.create({
              data: {
                tenantId: tenant.id,
                title: "Subscription Expiring in 2 Days",
                message: `Your current subscription (${planName}) will expire on ${new Date(sub.endDate).toLocaleDateString()}. Please renew or upgrade to ensure uninterrupted POS billing and inventory access.`,
                type: "SYSTEM"
              }
            });
            sentCount++;
          } else {
            errorsCount++;
          }
        } catch (err) {
          console.error(`\u274C [EXPIRY SCHEDULER] Error processing reminder for sub #${sub.id}:`, err.message);
          errorsCount++;
        }
      }
      console.log(`\u2713 [EXPIRY SCHEDULER] Scan complete. Reminders sent: ${sentCount}, Errors: ${errorsCount}
`);
    } catch (err) {
      console.error(`\u274C [EXPIRY SCHEDULER] Failed to run expiry scan:`, err.message);
    }
    return { sentCount, errorsCount };
  }
  /**
   * Initializes automatic background schedule timer on server boot.
   * Runs immediately on boot and sets up a recurring 1-hour interval check.
   */
  static initAutomatedScheduler() {
    console.log(`\u26A1 [EXPIRY SCHEDULER] Initializing background subscription expiry notification service...`);
    this.checkAndSendExpiryReminders().catch((err) => {
      console.error("Initial expiry reminder check failed", err);
    });
    const ONE_HOUR = 60 * 60 * 1e3;
    setInterval(() => {
      this.checkAndSendExpiryReminders().catch((err) => {
        console.error("Scheduled expiry reminder check failed", err);
      });
    }, ONE_HOUR);
  }
};

// src/modules/subscription/subscription.controller.ts
var SubscriptionController = class {
  static async listPlans(req, res) {
    try {
      const plans = await SubscriptionService.listAvailablePlans();
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getPlanDetails(req, res) {
    try {
      const { id } = req.params;
      const plan = await SubscriptionService.getPlanDetails(id);
      res.status(200).json({ success: true, data: plan });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async getCurrentSubscription(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const current = await SubscriptionService.getCurrentSubscription(tenantId);
      res.status(200).json({ success: true, data: current });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getSubscriptionHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const history = await SubscriptionService.getSubscriptionHistory(tenantId);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async subscribe(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const subscription = await SubscriptionService.createSubscription(tenantId, req.body);
      res.status(201).json({
        success: true,
        message: "Subscription created. Please proceed to payment to activate your plan.",
        data: subscription
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async changePlan(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const subscription = await SubscriptionService.changePlan(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Plan change initiated. Complete payment to activate your new plan.",
        data: subscription
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async renew(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const subscription = await SubscriptionService.renewSubscription(tenantId);
      res.status(200).json({
        success: true,
        message: "Renewal initiated. Complete payment to extend your subscription.",
        data: subscription
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async cancel(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const result = await SubscriptionService.cancelSubscription(tenantId);
      res.status(200).json({
        success: true,
        message: "Subscription cancelled successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async triggerExpiryCheck(req, res) {
    try {
      const summary = await SubscriptionExpiryService.checkAndSendExpiryReminders();
      res.status(200).json({
        success: true,
        message: `Automated expiry scan completed. Reminders sent: ${summary.sentCount}, Errors: ${summary.errorsCount}`,
        data: summary
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/middleware/authorize.ts
var authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized - User not authenticated" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "Forbidden - Insufficient permissions" });
      return;
    }
    next();
  };
};

// src/modules/subscription/subscription.validation.ts
import { z as z3 } from "zod";
var subscribeSchema = z3.object({
  planId: z3.string().uuid("Invalid plan ID format"),
  billingCycle: z3.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  autoRenew: z3.boolean().default(false)
});
var changePlanSchema = z3.object({
  newPlanId: z3.string().uuid("Invalid new plan ID format")
});
var cancelSubscriptionSchema = z3.object({
  reason: z3.string().optional()
});

// src/modules/subscription/subscription.routes.ts
var router3 = Router3();
router3.get("/plans", SubscriptionController.listPlans);
router3.get("/plans/:id", SubscriptionController.getPlanDetails);
router3.get("/current", authenticate, SubscriptionController.getCurrentSubscription);
router3.get("/history", authenticate, SubscriptionController.getSubscriptionHistory);
router3.post(
  "/subscribe",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: subscribeSchema }),
  SubscriptionController.subscribe
);
router3.post(
  "/change-plan",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: changePlanSchema }),
  SubscriptionController.changePlan
);
router3.post(
  "/renew",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  SubscriptionController.renew
);
router3.post(
  "/cancel",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: cancelSubscriptionSchema }),
  SubscriptionController.cancel
);
router3.post(
  "/check-expiry-reminders",
  authenticate,
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SubscriptionController.triggerExpiryCheck
);

// src/modules/payment/payment.routes.ts
import { Router as Router4 } from "express";

// src/app/lib/sslcommerz.ts
var SSLCommerzService = class {
  static get storeId() {
    return process.env.SSLCOMMERZ_STORE_ID || "testbox";
  }
  static get storePassword() {
    return process.env.SSLCOMMERZ_STORE_PASSWORD || "qwerty";
  }
  static get isSandbox() {
    return process.env.SSLCOMMERZ_IS_SANDBOX !== "false";
  }
  static get baseUrl() {
    return this.isSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  }
  /**
   * Initiate SSLCOMMERZ Payment Session
   */
  static async initPayment(data) {
    const initUrl = `${this.baseUrl}/gwprocess/v4/api.php`;
    const formData = new URLSearchParams();
    formData.append("store_id", this.storeId);
    formData.append("store_passwd", this.storePassword);
    formData.append("total_amount", data.totalAmount.toFixed(2));
    formData.append("currency", data.currency || "BDT");
    formData.append("tran_id", data.tranId);
    const defaultServerUrl = process.env.SERVER_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    formData.append("success_url", data.successUrl || process.env.SSLCOMMERZ_SUCCESS_URL || `${defaultServerUrl}/api/payments/sslcommerz/success`);
    formData.append("fail_url", data.failUrl || process.env.SSLCOMMERZ_FAIL_URL || `${defaultServerUrl}/api/payments/sslcommerz/fail`);
    formData.append("cancel_url", data.cancelUrl || process.env.SSLCOMMERZ_CANCEL_URL || `${defaultServerUrl}/api/payments/sslcommerz/cancel`);
    formData.append("ipn_url", data.ipnUrl || process.env.SSLCOMMERZ_IPN_URL || `${defaultServerUrl}/api/payments/sslcommerz/ipn`);
    formData.append("cus_name", data.customerName || "Customer");
    formData.append("cus_email", data.customerEmail || "customer@example.com");
    formData.append("cus_add1", data.customerAddress || "Dhaka, Bangladesh");
    formData.append("cus_city", data.customerCity || "Dhaka");
    formData.append("cus_country", data.customerCountry || "Bangladesh");
    formData.append("cus_phone", data.customerPhone || "01700000000");
    formData.append("product_name", data.productName);
    formData.append("product_category", data.productCategory || "Subscription");
    formData.append("product_profile", "general");
    formData.append("shipping_method", "NO");
    formData.append("num_of_item", "1");
    if (data.valueA) formData.append("value_a", data.valueA);
    if (data.valueB) formData.append("value_b", data.valueB);
    if (data.valueC) formData.append("value_c", data.valueC);
    if (data.valueD) formData.append("value_d", data.valueD);
    const response2 = await fetch(initUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const result = await response2.json();
    return result;
  }
  /**
   * Validate SSLCOMMERZ Payment using val_id
   */
  static async validatePayment(valId) {
    const queryParams = new URLSearchParams({
      val_id: valId,
      store_id: this.storeId,
      store_passwd: this.storePassword,
      format: "json"
    });
    const validateUrl = `${this.baseUrl}/validator/api/validationserverAPI.php?${queryParams.toString()}`;
    const response2 = await fetch(validateUrl, {
      method: "GET"
    });
    const result = await response2.json();
    return result;
  }
  /**
   * Query transaction by Merchant Transaction ID
   */
  static async queryTransaction(tranId) {
    const queryParams = new URLSearchParams({
      tran_id: tranId,
      store_id: this.storeId,
      store_passwd: this.storePassword,
      format: "json"
    });
    const queryUrl = `${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php?${queryParams.toString()}`;
    const response2 = await fetch(queryUrl, {
      method: "GET"
    });
    return await response2.json();
  }
};

// src/modules/payment/payment.service.ts
var PaymentService = class {
  /**
   * Initiate SSLCOMMERZ payment for a subscription
   */
  static async initiateSubscriptionPayment(tenantId, data, userRole) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: data.subscriptionId },
      include: {
        plan: true,
        tenant: true
      }
    });
    if (!subscription) {
      throw new Error("Subscription not found");
    }
    if (subscription.status === "ACTIVE") {
      throw new Error("This subscription is already active and paid for");
    }
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const isMatchingTenant = Boolean(tenantId && subscription.tenantId === tenantId);
    const isApprovedPendingRegistration = subscription.tenant?.verificationStatus === "APPROVED_PENDING_PAYMENT" && subscription.status === "PENDING";
    if (!isSuperAdmin && !isMatchingTenant && !isApprovedPendingRegistration) {
      throw new Error("Unauthorized access to this subscription");
    }
    const tranId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const basePrice = Number(subscription.plan.price);
    const durationDays = (new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1e3 * 60 * 60 * 24);
    const isYearly = durationDays > 45;
    const amount = isYearly ? Math.round(basePrice * 12 * 0.85) : basePrice;
    const payment = await prisma.payment.create({
      data: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        amount,
        currency: "BDT",
        tranId,
        status: "PENDING"
      }
    });
    const sslcommerzResponse = await SSLCommerzService.initPayment({
      totalAmount: amount,
      currency: "BDT",
      tranId,
      customerName: data.customerName || subscription.tenant.name,
      customerEmail: data.customerEmail || subscription.tenant.email || "billing@pharmacy.com",
      customerPhone: data.customerPhone || subscription.tenant.phone || "01700000000",
      customerAddress: data.customerAddress || subscription.tenant.address || "Bangladesh",
      customerCity: data.customerCity || "Dhaka",
      productName: `${subscription.plan.name} Subscription Plan`,
      productCategory: "SaaS Subscription",
      valueA: subscription.tenantId,
      valueB: subscription.id,
      valueC: "SUBSCRIBE"
    });
    if (sslcommerzResponse.status !== "SUCCESS" && !sslcommerzResponse.GatewayPageURL) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          rawResponse: sslcommerzResponse
        }
      });
      throw new Error(
        sslcommerzResponse.failedreason || "Failed to initialize SSLCOMMERZ payment session"
      );
    }
    return {
      paymentId: payment.id,
      tranId,
      amount,
      currency: "BDT",
      gatewayUrl: sslcommerzResponse.GatewayPageURL || sslcommerzResponse.redirectGatewayURL,
      sessionKey: sslcommerzResponse.sessionkey
    };
  }
  /**
   * Process and validate payment callback (Idempotent)
   */
  static async processPaymentValidation(callbackData) {
    const { tran_id, val_id } = callbackData;
    if (!tran_id) {
      throw new Error("Transaction ID is required");
    }
    const payment = await prisma.payment.findUnique({
      where: { tranId: tran_id },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });
    if (!payment) {
      throw new Error(`Payment record not found for transaction: ${tran_id}`);
    }
    if (payment.status === "VALIDATED") {
      return {
        success: true,
        alreadyProcessed: true,
        message: "Payment was already validated and subscription is active.",
        payment
      };
    }
    let isValid = false;
    let validationResult = null;
    if (val_id) {
      try {
        validationResult = await SSLCommerzService.validatePayment(val_id);
        if ((validationResult.status === "VALID" || validationResult.status === "VALIDATED") && (!validationResult.tran_id || validationResult.tran_id === payment.tranId)) {
          isValid = true;
        }
      } catch (err) {
        console.error("[PaymentService] SSLCOMMERZ val_id validation error:", err);
      }
    }
    if (!isValid && tran_id) {
      try {
        const queryRes = await SSLCommerzService.queryTransaction(tran_id);
        if (queryRes?.element && Array.isArray(queryRes.element)) {
          const matching = queryRes.element.find(
            (e) => e.tran_id === tran_id && (e.status === "VALID" || e.status === "VALIDATED")
          );
          if (matching) {
            validationResult = matching;
            isValid = true;
          }
        } else if (queryRes?.status === "VALID" || queryRes?.status === "VALIDATED") {
          validationResult = queryRes;
          isValid = true;
        }
      } catch (err) {
        console.error("[PaymentService] SSLCOMMERZ tran_id query error:", err);
      }
    }
    if (!isValid && (callbackData.status === "VALID" || callbackData.status === "VALIDATED")) {
      isValid = true;
    }
    if (!isValid) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          valId: val_id || null,
          rawResponse: validationResult || callbackData
        }
      });
      throw new Error("Payment validation failed with SSLCOMMERZ");
    }
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "VALIDATED",
          valId: val_id || validationResult?.val_id || null,
          bankTranId: callbackData.bank_tran_id || validationResult?.bank_tran_id || null,
          cardType: callbackData.card_type || validationResult?.card_type || null,
          cardBrand: callbackData.card_brand || validationResult?.card_brand || null,
          paymentMethod: callbackData.card_type || "SSLCOMMERZ",
          rawResponse: validationResult || callbackData
        }
      });
      let updatedSubscription = null;
      if (payment.subscriptionId) {
        updatedSubscription = await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: "ACTIVE"
          },
          include: { plan: true }
        });
        if (updatedSubscription.plan) {
          await tx.tenant.update({
            where: { id: payment.tenantId },
            data: {
              tier: updatedSubscription.plan.tier,
              verificationStatus: "ACTIVE",
              isActive: true
            }
          });
        }
      }
      return { updatedPayment, updatedSubscription };
    });
    await AuditService.log({
      tenantId: payment.tenantId,
      action: "SUBSCRIPTION_PAYMENT_SUCCESS",
      details: {
        tranId: payment.tranId,
        amount: payment.amount,
        subscriptionId: payment.subscriptionId
      }
    });
    return {
      success: true,
      message: "Payment successfully validated and subscription activated!",
      data: result
    };
  }
  /**
   * Handle Failed Payment
   */
  static async handleFailedPayment(callbackData) {
    const { tran_id } = callbackData;
    if (!tran_id) return;
    await prisma.payment.updateMany({
      where: { tranId: tran_id, status: "PENDING" },
      data: {
        status: "FAILED",
        rawResponse: callbackData
      }
    });
  }
  /**
   * Handle Cancelled Payment
   */
  static async handleCancelledPayment(callbackData) {
    const { tran_id } = callbackData;
    if (!tran_id) return;
    await prisma.payment.updateMany({
      where: { tranId: tran_id, status: "PENDING" },
      data: {
        status: "CANCELLED",
        rawResponse: callbackData
      }
    });
  }
  /**
   * Get Tenant Payment History
   */
  static async getTenantPayments(tenantId) {
    return await prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });
  }
  /**
   * Validate payment manually by Payment ID
   */
  static async validatePaymentById(paymentId, tenantId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    if (!payment) {
      throw new Error("Payment not found");
    }
    if (payment.tenantId !== tenantId) {
      throw new Error("Unauthorized");
    }
    if (payment.status === "VALIDATED") {
      return { success: true, status: "VALIDATED", message: "Payment is already validated" };
    }
    if (payment.valId) {
      return await this.processPaymentValidation({
        tran_id: payment.tranId,
        val_id: payment.valId
      });
    }
    const queryRes = await SSLCommerzService.queryTransaction(payment.tranId);
    if (queryRes?.status === "VALID" || queryRes?.status === "VALIDATED") {
      return await this.processPaymentValidation({
        tran_id: payment.tranId,
        val_id: queryRes.val_id,
        ...queryRes
      });
    }
    return {
      success: false,
      status: payment.status,
      message: "Payment could not be validated yet"
    };
  }
};

// src/modules/payment/payment.controller.ts
var PaymentController = class {
  /**
   * Initiate SSLCOMMERZ Payment Session
   */
  static async initiate(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role;
      const result = await PaymentService.initiateSubscriptionPayment(tenantId, req.body, userRole);
      res.status(200).json({
        success: true,
        message: "Payment session initialized successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * SSLCOMMERZ Success Callback (POST & GET)
   */
  static async handleSuccess(req, res) {
    const callbackData = { ...req.query, ...req.body };
    const tranId = callbackData.tran_id || "";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
    try {
      if (!tranId) {
        throw new Error("Transaction ID is missing from payment callback");
      }
      const result = await PaymentService.processPaymentValidation(callbackData);
      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(`${clientUrl}/payment/success?tran_id=${encodeURIComponent(tranId)}`);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error("[PaymentController] SSLCOMMERZ handleSuccess error:", error.message);
      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(
          `${clientUrl}/payment/fail?tran_id=${encodeURIComponent(tranId)}&error=${encodeURIComponent(error.message)}`
        );
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * SSLCOMMERZ Fail Callback (POST & GET)
   */
  static async handleFail(req, res) {
    const callbackData = { ...req.query, ...req.body };
    const tranId = callbackData.tran_id || "";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
    try {
      await PaymentService.handleFailedPayment(callbackData);
      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(`${clientUrl}/payment/fail?tran_id=${encodeURIComponent(tranId)}`);
        return;
      }
      res.status(400).json({ success: false, message: "Payment failed", tranId });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * SSLCOMMERZ Cancel Callback (POST & GET)
   */
  static async handleCancel(req, res) {
    const callbackData = { ...req.query, ...req.body };
    const tranId = callbackData.tran_id || "";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
    try {
      await PaymentService.handleCancelledPayment(callbackData);
      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(`${clientUrl}/payment/cancel?tran_id=${encodeURIComponent(tranId)}`);
        return;
      }
      res.status(200).json({ success: true, message: "Payment cancelled", tranId });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * SSLCOMMERZ IPN Endpoint (POST & GET)
   */
  static async handleIPN(req, res) {
    try {
      const callbackData = { ...req.query, ...req.body };
      const result = await PaymentService.processPaymentValidation(callbackData);
      res.status(200).json({ success: true, ipnStatus: "PROCESSED", data: result });
    } catch (error) {
      console.error("[PaymentController] IPN Error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * Get Tenant Payment History
   */
  static async getHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const payments = await PaymentService.getTenantPayments(tenantId);
      res.status(200).json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  /**
   * Manual Payment Validation
   */
  static async validatePayment(req, res) {
    try {
      const id = req.params.id;
      const tenantId = req.user.tenantId;
      const result = await PaymentService.validatePaymentById(id, tenantId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/modules/payment/payment.validation.ts
import { z as z4 } from "zod";
var initiatePaymentSchema = z4.object({
  subscriptionId: z4.string().uuid("Invalid subscription ID format"),
  customerName: z4.string().min(1).optional(),
  customerEmail: z4.string().email().optional(),
  customerPhone: z4.string().optional(),
  customerAddress: z4.string().optional(),
  customerCity: z4.string().optional()
});
var sslcommerzCallbackSchema = z4.object({
  tran_id: z4.string(),
  val_id: z4.string().optional(),
  amount: z4.string().optional(),
  card_type: z4.string().optional(),
  store_amount: z4.string().optional(),
  bank_tran_id: z4.string().optional(),
  status: z4.string().optional(),
  tran_date: z4.string().optional(),
  currency: z4.string().optional(),
  card_issuer: z4.string().optional(),
  card_brand: z4.string().optional(),
  card_sub_brand: z4.string().optional(),
  card_issuer_country: z4.string().optional(),
  error: z4.string().optional(),
  value_a: z4.string().optional(),
  // tenantId
  value_b: z4.string().optional(),
  // subscriptionId
  value_c: z4.string().optional()
  // action
});

// src/modules/payment/payment.routes.ts
var router4 = Router4();
router4.post("/sslcommerz/success", PaymentController.handleSuccess);
router4.get("/sslcommerz/success", PaymentController.handleSuccess);
router4.post("/sslcommerz/fail", PaymentController.handleFail);
router4.get("/sslcommerz/fail", PaymentController.handleFail);
router4.post("/sslcommerz/cancel", PaymentController.handleCancel);
router4.get("/sslcommerz/cancel", PaymentController.handleCancel);
router4.post("/sslcommerz/ipn", PaymentController.handleIPN);
router4.get("/sslcommerz/ipn", PaymentController.handleIPN);
router4.post("/success", PaymentController.handleSuccess);
router4.get("/success", PaymentController.handleSuccess);
router4.post("/fail", PaymentController.handleFail);
router4.get("/fail", PaymentController.handleFail);
router4.post("/cancel", PaymentController.handleCancel);
router4.get("/cancel", PaymentController.handleCancel);
router4.post(
  "/initiate",
  optionalAuthenticate,
  validateRequest({ body: initiatePaymentSchema }),
  PaymentController.initiate
);
router4.get("/history", authenticate, PaymentController.getHistory);
router4.get("/:id/validate", authenticate, PaymentController.validatePayment);

// src/modules/tenant/tenant.routes.ts
import { Router as Router5 } from "express";

// src/modules/tenant/tenant.service.ts
var TenantService = class {
  static async getProfile(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            branches: { where: { isActive: true } },
            users: { where: { isActive: true } },
            products: { where: { isActive: true } }
          }
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
          take: 1
        }
      }
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const currentSub = tenant.subscriptions[0] || null;
    const tier = currentSub?.plan?.tier || tenant.tier || "TRIAL";
    const planConfig = getPlanConfig(tier);
    const isTrial = tier === "TRIAL";
    const isExpired = currentSub ? isSubscriptionExpired(currentSub) : true;
    const trialDaysRemaining = isTrial && currentSub?.endDate ? getTrialRemainingDays(currentSub.endDate) : 0;
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
      planConfig,
      stats: {
        activeBranches: tenant._count.branches,
        activeUsers: tenant._count.users,
        activeProducts: tenant._count.products
      },
      currentSubscription: currentSub
    };
  }
  static async updateProfile(tenantId, data) {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...data.name && { name: data.name },
        ...data.email && { email: data.email },
        ...data.phone && { phone: data.phone },
        ...data.address && { address: data.address },
        ...data.logoUrl !== void 0 && { logoUrl: data.logoUrl || null },
        ...data.logoPublicId !== void 0 && { logoPublicId: data.logoPublicId || null }
      }
    });
    return updated;
  }
  static async getSubscriptionAndLimits(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: { where: { isActive: true } },
        users: { where: { isActive: true } },
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          orderBy: { endDate: "desc" },
          take: 1
        }
      }
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const activeSub = tenant.subscriptions && tenant.subscriptions[0];
    const tier = activeSub?.plan?.tier || tenant.tier || "TRIAL";
    const planConfig = getPlanConfig(tier);
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
        isStaffLimitReached: staffCount >= maxStaff
      },
      features: {
        interBranchTransfer: tier !== "STARTER" && tier !== "TRIAL",
        regionalAdmin: tier !== "STARTER" && tier !== "TRIAL",
        branchPriceOverride: tier !== "STARTER" && tier !== "TRIAL",
        customAudit: tier === "ENTERPRISE",
        apiAccess: tier === "ENTERPRISE"
      }
    };
  }
};

// src/modules/tenant/tenant.controller.ts
var TenantController = class {
  static async getProfile(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const profile = await TenantService.getProfile(tenantId);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async updateProfile(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const updated = await TenantService.updateProfile(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Company profile updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getSubscription(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const subInfo = await TenantService.getSubscriptionAndLimits(tenantId);
      res.status(200).json({ success: true, data: subInfo });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getUsage(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const subInfo = await TenantService.getSubscriptionAndLimits(tenantId);
      res.status(200).json({
        success: true,
        data: {
          usage: subInfo.usage,
          features: subInfo.features
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/modules/tenant/tenant.validation.ts
import { z as z5 } from "zod";
var updateTenantProfileSchema = z5.object({
  name: z5.string().min(2, "Company name must be at least 2 characters").optional(),
  email: z5.string().email("Invalid email format").optional(),
  phone: z5.string().optional(),
  address: z5.string().optional(),
  logoUrl: z5.string().url().optional().or(z5.literal("")),
  logoPublicId: z5.string().optional()
});

// src/modules/tenant/tenant.routes.ts
var router5 = Router5();
router5.use(authenticate);
router5.get("/profile", TenantController.getProfile);
router5.patch(
  "/profile",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: updateTenantProfileSchema }),
  TenantController.updateProfile
);
router5.get("/subscription", TenantController.getSubscription);
router5.get("/usage", TenantController.getUsage);

// src/modules/branch/branch.routes.ts
import { Router as Router6 } from "express";

// src/modules/branch/branch.service.ts
var BranchService = class {
  static async createBranch(tenantId, userId, data) {
    const branchCheck = await checkCanAddBranch(tenantId);
    if (!branchCheck.allowed) {
      throw new Error(branchCheck.message || "Branch limit reached for current subscription plan");
    }
    const branch = await prisma.branch.create({
      data: {
        tenantId,
        name: data.name,
        location: data.location || null,
        phone: data.phone || null,
        email: data.email || null,
        isActive: true
      }
    });
    await AuditService.log({
      tenantId,
      branchId: branch.id,
      userId,
      action: "BRANCH_CREATE",
      details: { branchName: branch.name, location: branch.location }
    });
    return branch;
  }
  static async listBranches(tenantId, userRole, userBranchId) {
    const where = { tenantId, isActive: true };
    return await prisma.branch.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            inventories: true,
            sales: true
          }
        }
      }
    });
  }
  static async getBranchDetails(branchId, tenantId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            inventories: true,
            sales: true
          }
        }
      }
    });
    if (!branch) {
      throw new Error("Branch not found");
    }
    return branch;
  }
  static async updateBranch(branchId, tenantId, userId, data) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId }
    });
    if (!branch) {
      throw new Error("Branch not found");
    }
    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...data.name && { name: data.name },
        ...data.location !== void 0 && { location: data.location },
        ...data.phone !== void 0 && { phone: data.phone },
        ...data.email !== void 0 && { email: data.email },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
    await AuditService.log({
      tenantId,
      branchId,
      userId,
      action: "BRANCH_UPDATE",
      details: data
    });
    return updated;
  }
  static async deleteBranch(branchId, tenantId, userId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      include: {
        _count: { select: { sales: true, inventories: true } }
      }
    });
    if (!branch) {
      throw new Error("Branch not found");
    }
    if (branch._count.sales > 0 || branch._count.inventories > 0) {
      const deactivated = await prisma.branch.update({
        where: { id: branchId },
        data: { isActive: false }
      });
      await AuditService.log({
        tenantId,
        branchId,
        userId,
        action: "BRANCH_DEACTIVATE",
        details: { reason: "Soft deleted due to existing records" }
      });
      return {
        message: "Branch has historical records and was deactivated instead of permanently deleted.",
        branch: deactivated
      };
    }
    await prisma.branch.delete({ where: { id: branchId } });
    await AuditService.log({
      tenantId,
      userId,
      action: "BRANCH_DELETE",
      details: { branchId }
    });
    return { message: "Branch deleted permanently" };
  }
};

// src/modules/branch/branch.controller.ts
var BranchController = class {
  static async createBranch(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const branch = await BranchService.createBranch(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Branch created successfully",
        data: branch
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listBranches(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const branches = await BranchService.listBranches(tenantId, userRole, userBranchId);
      res.status(200).json({ success: true, data: branches });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getBranchDetails(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const branch = await BranchService.getBranchDetails(id, tenantId);
      res.status(200).json({ success: true, data: branch });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async updateBranch(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const updated = await BranchService.updateBranch(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Branch updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteBranch(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await BranchService.deleteBranch(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/middleware/planLimiter.ts
var TIER_ORDER = {
  TRIAL: 0,
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3
};
var requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(req.user.role)) {
      next();
      return;
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    if (!tenant) {
      res.status(404).json({ success: false, message: "Tenant not found" });
      return;
    }
    if (!tenant.isActive) {
      res.status(403).json({
        success: false,
        message: "Your pharmacy account is suspended. Please contact platform support."
      });
      return;
    }
    const activeSub = tenant.subscriptions && tenant.subscriptions[0];
    const isTrial = activeSub?.plan?.tier === "TRIAL" || tenant.tier === "TRIAL";
    if (!activeSub || isSubscriptionExpired(activeSub)) {
      if (isTrial) {
        res.status(402).json({
          success: false,
          isTrial: true,
          isTrialExpired: true,
          isExpired: true,
          message: "Your 7-day Free Trial has expired. Please upgrade to a paid subscription plan to continue managing your pharmacy.",
          tier: "TRIAL",
          trialDaysRemaining: 0
        });
        return;
      }
      res.status(402).json({
        success: false,
        isTrial: false,
        isExpired: true,
        message: "No active subscription found. Please renew or upgrade your subscription plan.",
        tier: tenant.tier
      });
      return;
    }
    const trialDaysRemaining = isTrial ? getTrialRemainingDays(activeSub.endDate) : void 0;
    req.subscription = activeSub;
    req.tenant = tenant;
    req.isTrial = isTrial;
    req.trialDaysRemaining = trialDaysRemaining;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to verify subscription" });
  }
};
var requireTier = (minTier) => {
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
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId }
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
          requiredTier: minTier
        });
        return;
      }
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || "Failed to check tier permissions" });
    }
  };
};
var checkBranchLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(req.user.role)) {
      next();
      return;
    }
    const check = await checkCanAddBranch(req.user.tenantId);
    if (!check.allowed) {
      res.status(403).json({
        success: false,
        message: check.message,
        currentBranches: check.currentBranches,
        maxBranches: check.maxBranches
      });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to check branch limits" });
  }
};
var checkStaffLimit = async (req, res, next) => {
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
    const check = await checkCanAddStaff(req.user.tenantId, targetBranchId);
    if (!check.allowed) {
      res.status(403).json({
        success: false,
        message: check.message,
        currentStaff: check.currentStaff,
        maxStaff: check.maxStaff
      });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to check staff limits" });
  }
};

// src/modules/branch/branch.validation.ts
import { z as z6 } from "zod";
var createBranchSchema = z6.object({
  name: z6.string().min(2, "Branch name must be at least 2 characters"),
  location: z6.string().optional(),
  phone: z6.string().optional(),
  email: z6.string().email().optional()
});
var updateBranchSchema = z6.object({
  name: z6.string().min(2).optional(),
  location: z6.string().optional(),
  phone: z6.string().optional(),
  email: z6.string().email().optional(),
  isActive: z6.boolean().optional()
});

// src/modules/branch/branch.routes.ts
var router6 = Router6();
router6.use(authenticate, requireActiveSubscription);
router6.get("/", BranchController.listBranches);
router6.get("/:id", BranchController.getBranchDetails);
router6.post(
  "/",
  requirePermission("branches.manage"),
  checkBranchLimit,
  validateRequest({ body: createBranchSchema }),
  BranchController.createBranch
);
router6.patch(
  "/:id",
  requirePermission("branches.manage"),
  validateRequest({ body: updateBranchSchema }),
  BranchController.updateBranch
);
router6.delete(
  "/:id",
  requirePermission("branches.manage"),
  BranchController.deleteBranch
);

// src/modules/user/user.routes.ts
import { Router as Router7 } from "express";

// src/modules/user/user.service.ts
import bcrypt3 from "bcryptjs";
var ALL_PHARMACY_PERMISSIONS = [
  // 1. Dashboard
  {
    id: "dashboard.view",
    name: "View Dashboard",
    category: "Dashboard",
    description: "Access main dashboard metrics, financial KPI summaries, and branch status."
  },
  // 2. Sales & POS
  {
    id: "pos.manage",
    name: "Sales / POS",
    category: "Sales & POS",
    description: "Process live checkout, scan barcodes, dispense medicines, and generate customer invoices."
  },
  {
    id: "pos.history",
    name: "Sales History",
    category: "Sales & POS",
    description: "Inspect customer receipts, transaction history, invoice details, and register sales."
  },
  {
    id: "accounts.payment_sales",
    name: "Payment Method Sales",
    category: "Sales & POS",
    description: "Analyze revenue breakdowns by cash, card, mobile banking, and digital payment methods."
  },
  {
    id: "accounts.product_sales",
    name: "Product-Wise Sales",
    category: "Sales & POS",
    description: "Inspect sales velocity, units sold, and revenue contributions by items and categories."
  },
  {
    id: "accounts.reports",
    name: "Sales Reports",
    category: "Sales & POS",
    description: "Generate sales reports, profit/loss summaries, and financial performance analytics."
  },
  {
    id: "pos.vat",
    name: "VAT Settings",
    category: "Sales & POS",
    description: "Configure tax rules, branch VAT percentages, and receipt print options."
  },
  // 3. Category Management
  {
    id: "category.manage",
    name: "Manage Categories",
    category: "Category Management",
    description: "Create, view, update, and manage product categories."
  },
  {
    id: "category.subcategories",
    name: "Manage Subcategories",
    category: "Category Management",
    description: "Create, update, and manage subcategories and product classifications."
  },
  // 4. Inventory
  {
    id: "inventory.add_product",
    name: "Add Product",
    category: "Inventory",
    description: "Register new products, dosage forms, manufacturers, and initial catalog entries."
  },
  {
    id: "inventory.product_list",
    name: "Product List",
    category: "Inventory",
    description: "Browse, search, edit product details, update prices, and view catalog status."
  },
  // 5. Stock Management
  {
    id: "stock.add_stock",
    name: "Add Stock",
    category: "Stock Management",
    description: "Record inward stock shipments, batch numbers, expiry dates, and purchase costs."
  },
  {
    id: "stock.stock_list",
    name: "Stock List",
    category: "Stock Management",
    description: "Inspect branch inventory stock levels, low-stock warnings, and expiring batches."
  },
  {
    id: "stock.stock_history",
    name: "Stock History",
    category: "Stock Management",
    description: "Review audit ledger of stock movements, batch arrivals, sales deductions, and adjustments."
  },
  {
    id: "stock.allocation",
    name: "Stock Allocation",
    category: "Stock Management",
    description: "Allocate inventory items and batches to physical racks, shelves, and storage bins."
  },
  {
    id: "stock.allocation_history",
    name: "Allocation History",
    category: "Stock Management",
    description: "Track physical allocation history, bin movements, and rack placement records."
  },
  {
    id: "stock.transfer",
    name: "Transfer Stock",
    category: "Stock Management",
    description: "Initiate and dispatch stock transfers from this branch to other branch locations."
  },
  {
    id: "stock.transfer_history",
    name: "Transfer History",
    category: "Stock Management",
    description: "Track dispatch records, in-transit status, and inter-branch transfer logs."
  },
  {
    id: "stock.receive",
    name: "Stock Receive",
    category: "Stock Management",
    description: "Inspect and accept incoming inter-branch shipments and record damaged/missing counts."
  },
  {
    id: "stock.damaged",
    name: "Damaged Products",
    category: "Stock Management",
    description: "Review transit damaged reports, quarantine damaged stock, and dispose of expired items."
  },
  // 6. Location Management
  {
    id: "location.create_rack",
    name: "Create Rack",
    category: "Location Management",
    description: "Set up and configure warehouse racks, shelves, and storage bin identifiers."
  },
  {
    id: "location.rack_list",
    name: "Rack List",
    category: "Location Management",
    description: "Browse branch storage layouts, inspect bin contents, and manage location capacities."
  },
  // 7. Supplier Management
  {
    id: "supplier.view",
    name: "Suppliers",
    category: "Supplier Management",
    description: "Browse supplier directories, company profiles, and supply partner contacts."
  },
  {
    id: "supplier.manage",
    name: "Create / Manage Supplier",
    category: "Supplier Management",
    description: "Add new suppliers, edit vendor terms, and manage supplier profiles."
  },
  {
    id: "supplier.purchase_history",
    name: "Purchase History",
    category: "Supplier Management",
    description: "Review supplier purchase orders, invoice amounts, batch receipts, and dates."
  },
  {
    id: "supplier.payments_due",
    name: "Payments / Due",
    category: "Supplier Management",
    description: "Track unpaid vendor balances, record purchase dues, and settle supplier invoices."
  },
  {
    id: "supplier.contacts",
    name: "Supplier & Contact Management",
    category: "Supplier Management",
    description: "Manage sales reps, medical representatives, and vendor contact persons."
  },
  // 8. Accounts & Finance
  {
    id: "accounts.overview",
    name: "Overview",
    category: "Accounts & Finance",
    description: "View branch financial overview, total cash in hand, receivables, and payables."
  },
  {
    id: "accounts.financial_accounts",
    name: "Financial Accounts",
    category: "Accounts & Finance",
    description: "Create and manage cash registers, petty cash, bank accounts, and mobile wallets."
  },
  {
    id: "accounts.fund_transfer",
    name: "Fund Transfer",
    category: "Accounts & Finance",
    description: "Execute internal double-entry fund transfers between pharmacy accounts with audit logs."
  },
  {
    id: "accounts.supplier_due",
    name: "Supplier Payments / Due",
    category: "Accounts & Finance",
    description: "Financial settlement and disbursement of supplier dues and vendor payables."
  },
  {
    id: "accounts.transaction_history",
    name: "Transaction History",
    category: "Accounts & Finance",
    description: "Inspect the complete financial ledger, credits, debits, and balance statements."
  },
  // 9. Expenses & Bills
  {
    id: "expenses.list",
    name: "Bill List",
    category: "Expenses & Bills",
    description: "Manage recurring bills (Rent, Electricity, Internet, Maintenance) and billing schedules."
  },
  {
    id: "expenses.pay",
    name: "Pay Bill",
    category: "Expenses & Bills",
    description: "Record and disburse branch expense payments directly from selected financial accounts."
  },
  {
    id: "expenses.history",
    name: "Bill History",
    category: "Expenses & Bills",
    description: "Review monthly expense breakdown logs, payment vouchers, and utility bills."
  },
  // 10. Employee & Salary
  {
    id: "employee.view",
    name: "Employee List",
    category: "Employee & Salary",
    description: "View branch employee roster, contact info, join dates, and employment statuses."
  },
  {
    id: "attendance.manage",
    name: "Attendance Management",
    category: "Employee & Salary",
    description: "Record daily staff attendance (Present, Absent, Late, Half Day) and monthly summaries."
  },
  {
    id: "attendance.offdays",
    name: "Off-Day Settings",
    category: "Employee & Salary",
    description: "Configure weekly off-days, monthly holiday calendars, and branch working days."
  },
  {
    id: "salary.deductions",
    name: "Salary Deduction Rules",
    category: "Employee & Salary",
    description: "Configure rules for late penalties, unexcused absence deductions, and salary cut policies."
  },
  {
    id: "salary.manage",
    name: "Salary Management",
    category: "Employee & Salary",
    description: "Calculate monthly payroll, manage dynamic allowances, and disburse staff salaries."
  },
  {
    id: "salary.history",
    name: "Salary History",
    category: "Employee & Salary",
    description: "Review monthly payroll disbursement archives, pay slips, and staff compensation logs."
  },
  {
    id: "salaries.base_salary.edit",
    name: "Configure Base Salary",
    category: "Employee & Salary",
    description: "Set and update employee Base Salary packages and contractual compensation."
  },
  // 11. Staff Management
  {
    id: "staff.view",
    name: "Staff List",
    category: "Staff Management",
    description: "View pharmacy staff accounts, active statuses, and assigned operational roles."
  },
  {
    id: "staff.create",
    name: "Create Staff",
    category: "Staff Management",
    description: "Create new pharmacy staff credentials, assign branch, and configure access roles."
  },
  {
    id: "roles.manage",
    name: "Roles & Permissions",
    category: "Staff Management",
    description: "Create custom roles, edit role permissions, and customize operational staff privileges."
  },
  // 12. Branch Network & Settings
  {
    id: "branches.manage",
    name: "Branch Network",
    category: "Branch Network & Settings",
    description: "View and configure branch network locations, contact information, and branch settings."
  },
  {
    id: "settings.manage",
    name: "Pharmacy Settings & Profile",
    category: "Branch Network & Settings",
    description: "Update pharmacy business profile, company information, and organizational preferences."
  }
];
var DEFAULT_PHARMACY_ROLES = [];
var UserService = class {
  /**
   * Ensure default pharmacy roles are seeded for a tenant
   */
  static async ensureDefaultRoles(tenantId) {
    const existing = await prisma.pharmacyRole.findMany({
      where: { tenantId }
    });
    if (existing.length === 0) {
      for (const def of DEFAULT_PHARMACY_ROLES) {
        await prisma.pharmacyRole.create({
          data: {
            tenantId,
            name: def.name,
            description: def.description,
            permissions: def.permissions,
            isSystem: def.isSystem
          }
        });
      }
    }
  }
  /**
   * ==================== PHARMACY ROLE CRUD ====================
   */
  static async listPharmacyRoles(tenantId) {
    await this.ensureDefaultRoles(tenantId);
    const roles = await prisma.pharmacyRole.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    return roles.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      isSystem: r.isSystem,
      isActive: r.isActive ?? true,
      userCount: r._count?.users || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }
  static async createPharmacyRole(tenantId, userId, data) {
    const nameTrimmed = data.name.trim();
    if (nameTrimmed.toUpperCase() === "COMPANY_OWNER" || nameTrimmed.toUpperCase() === "SUPER_ADMIN") {
      throw new Error("Cannot create role with reserved system name.");
    }
    const existing = await prisma.pharmacyRole.findFirst({
      where: {
        tenantId,
        name: { equals: nameTrimmed, mode: "insensitive" }
      }
    });
    if (existing) {
      throw new Error(`A role named "${nameTrimmed}" already exists in your pharmacy.`);
    }
    const role = await prisma.pharmacyRole.create({
      data: {
        tenantId,
        name: nameTrimmed,
        description: data.description?.trim() || null,
        permissions: data.permissions || [],
        isSystem: false,
        isActive: data.isActive !== void 0 ? data.isActive : true
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_CREATE",
      details: { roleId: role.id, name: role.name, permissionsCount: role.permissions.length }
    });
    return role;
  }
  static async updatePharmacyRole(tenantId, roleId, userId, data) {
    const role = await prisma.pharmacyRole.findFirst({
      where: { id: roleId, tenantId }
    });
    if (!role) {
      throw new Error("Pharmacy role not found");
    }
    const updateData = {};
    if (data.name) {
      const nameTrimmed = data.name.trim();
      if (nameTrimmed.toUpperCase() === "COMPANY_OWNER" || nameTrimmed.toUpperCase() === "SUPER_ADMIN") {
        throw new Error("Cannot rename role to reserved system name.");
      }
      const duplicate = await prisma.pharmacyRole.findFirst({
        where: {
          tenantId,
          name: { equals: nameTrimmed, mode: "insensitive" },
          id: { not: roleId }
        }
      });
      if (duplicate) {
        throw new Error(`A role named "${nameTrimmed}" already exists in your pharmacy.`);
      }
      updateData.name = nameTrimmed;
    }
    if (data.description !== void 0) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.permissions !== void 0) {
      updateData.permissions = data.permissions;
    }
    if (data.isActive !== void 0) {
      updateData.isActive = data.isActive;
    }
    const updated = await prisma.pharmacyRole.update({
      where: { id: roleId },
      data: updateData
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_UPDATE",
      details: { roleId, changes: Object.keys(data) }
    });
    return updated;
  }
  static async batchUpdateRolePermissions(tenantId, userId, matrix) {
    const updatedRoles = [];
    for (const item of matrix) {
      const role = await prisma.pharmacyRole.findFirst({
        where: { id: item.roleId, tenantId }
      });
      if (role) {
        const updated = await prisma.pharmacyRole.update({
          where: { id: item.roleId },
          data: { permissions: item.permissions }
        });
        updatedRoles.push(updated);
      }
    }
    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_MATRIX_UPDATE",
      details: { count: matrix.length }
    });
    return updatedRoles;
  }
  static async deletePharmacyRole(tenantId, roleId, userId) {
    const role = await prisma.pharmacyRole.findFirst({
      where: { id: roleId, tenantId },
      include: {
        _count: { select: { users: true } }
      }
    });
    if (!role) {
      throw new Error("Pharmacy role not found");
    }
    if (role.isSystem) {
      throw new Error("Default system roles cannot be deleted.");
    }
    if (role._count?.users > 0) {
      throw new Error(
        `Cannot delete role "${role.name}" because ${role._count.users} staff member(s) are currently assigned to it. Please reassign their roles first.`
      );
    }
    await prisma.pharmacyRole.delete({ where: { id: roleId } });
    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_DELETE",
      details: { roleId, name: role.name }
    });
    return { success: true, message: `Role "${role.name}" deleted successfully.` };
  }
  /**
   * ==================== PHARMACY STAFF CRUD ====================
   */
  static async createUser(tenantId, creatorId, creatorRole, data) {
    if (creatorRole !== "COMPANY_OWNER" && creatorRole !== "SUPER_ADMIN") {
      throw new Error("Only the Pharmacy Owner can create new staff members.");
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const staffCheck = await checkCanAddStaff(tenantId, data.branchId);
    if (!staffCheck.allowed) {
      throw new Error(staffCheck.message || "Staff limit reached for current subscription plan");
    }
    const identifier = (data.username || data.email || "").trim();
    if (!identifier) {
      throw new Error("Email is required");
    }
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username || data.email }
        ]
      }
    });
    if (existing) {
      throw new Error("A user with this email or username already exists");
    }
    if (data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: data.branchId, tenantId }
      });
      if (!branch) {
        throw new Error("Invalid branch ID for this tenant");
      }
    }
    await this.ensureDefaultRoles(tenantId);
    let matchedRole = await prisma.pharmacyRole.findFirst({
      where: {
        tenantId,
        OR: [
          { id: data.role },
          { name: { equals: data.role, mode: "insensitive" } }
        ]
      }
    });
    if (!matchedRole) {
      matchedRole = await prisma.pharmacyRole.findFirst({
        where: { tenantId }
      });
    }
    const assignedPermissions = matchedRole?.permissions || [];
    const roleNameUpper = (matchedRole?.name || data.role).toUpperCase().replace(/\s+/g, "_");
    let enumRole = "CASHIER";
    if (roleNameUpper.includes("MANAGER") || roleNameUpper.includes("BRANCH")) {
      enumRole = "BRANCH_MANAGER";
    } else if (roleNameUpper.includes("INVENTORY")) {
      enumRole = "INVENTORY_EXECUTIVE";
    } else if (roleNameUpper.includes("ACCOUNT")) {
      enumRole = "ACCOUNTS";
    } else if (roleNameUpper.includes("AUDIT")) {
      enumRole = "AUDITOR";
    } else {
      enumRole = "CASHIER";
    }
    const passwordHash = await bcrypt3.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        username: data.username || data.email,
        email: data.email || null,
        name: data.name || null,
        phone: data.phone || null,
        passwordHash,
        role: enumRole,
        pharmacyRoleId: matchedRole?.id || null,
        pharmacyRoleName: matchedRole?.name || data.role,
        permissions: assignedPermissions,
        branchId: data.branchId || null,
        isActive: true
      },
      include: {
        pharmacyRole: true,
        branch: { select: { id: true, name: true } }
      }
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId || null,
      userId: creatorId,
      action: "USER_CREATE",
      details: { createdUserId: user.id, username: user.username, role: user.pharmacyRoleName || user.role }
    });
    return {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      pharmacyRoleId: user.pharmacyRoleId,
      pharmacyRoleName: user.pharmacyRole?.name || user.pharmacyRoleName,
      permissions: user.permissions,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      branch: user.branch,
      createdAt: user.createdAt
    };
  }
  static async listUsers(tenantId, query, userRole, userBranchId) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (userRole === "BRANCH_MANAGER" && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.role) {
      where.OR = [
        { role: query.role },
        { pharmacyRoleName: { contains: query.role, mode: "insensitive" } }
      ];
    }
    if (query.isActive !== void 0) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { username: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { pharmacyRoleName: { contains: query.search, mode: "insensitive" } }
      ];
    }
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          pharmacyRole: true,
          branch: { select: { id: true, name: true } }
        }
      })
    ]);
    return {
      data: users.map((u) => ({
        id: u.id,
        tenantId: u.tenantId,
        branchId: u.branchId,
        role: u.role,
        pharmacyRoleId: u.pharmacyRoleId,
        pharmacyRoleName: u.role === "COMPANY_OWNER" ? "Pharmacy Owner" : u.pharmacyRole?.name || u.pharmacyRoleName || u.role,
        permissions: u.role === "COMPANY_OWNER" ? ["*"] : u.pharmacyRole?.permissions?.length ? u.pharmacyRole.permissions : u.permissions || [],
        username: u.username,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
        branch: u.branch
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async getUserDetails(userId, tenantId) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        pharmacyRole: true,
        branch: { select: { id: true, name: true, location: true } }
      }
    });
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      pharmacyRoleId: user.pharmacyRoleId,
      pharmacyRoleName: user.role === "COMPANY_OWNER" ? "Pharmacy Owner" : user.pharmacyRole?.name || user.pharmacyRoleName || user.role,
      permissions: user.role === "COMPANY_OWNER" ? ["*"] : user.pharmacyRole?.permissions?.length ? user.pharmacyRole.permissions : user.permissions || [],
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      branch: user.branch
    };
  }
  static async updateUser(userId, tenantId, updaterId, updaterRole, data) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { pharmacyRole: true }
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role === "COMPANY_OWNER" && updaterRole !== "SUPER_ADMIN" && updaterId !== userId) {
      throw new Error("Pharmacy Owner account cannot be altered by delegates.");
    }
    let pharmacyRoleId = user.pharmacyRoleId;
    let pharmacyRoleName = user.pharmacyRoleName;
    let permissions = user.permissions;
    if (data.role && user.role !== "COMPANY_OWNER") {
      const matchedRole = await prisma.pharmacyRole.findFirst({
        where: {
          tenantId,
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } }
          ]
        }
      });
      if (matchedRole) {
        pharmacyRoleId = matchedRole.id;
        pharmacyRoleName = matchedRole.name;
        permissions = matchedRole.permissions || [];
      } else {
        pharmacyRoleName = data.role;
      }
    }
    const updateData = {
      ...data.name !== void 0 && { name: data.name },
      ...data.email !== void 0 && { email: data.email },
      ...data.phone !== void 0 && { phone: data.phone },
      ...data.branchId !== void 0 && { branchId: data.branchId },
      ...data.isActive !== void 0 && { isActive: data.isActive },
      pharmacyRoleId,
      pharmacyRoleName,
      permissions
    };
    if (data.password) {
      updateData.passwordHash = await bcrypt3.hash(data.password, 10);
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        pharmacyRole: true,
        branch: { select: { id: true, name: true } }
      }
    });
    await AuditService.log({
      tenantId,
      branchId: updated.branchId,
      userId: updaterId,
      action: "USER_UPDATE",
      details: { updatedUserId: userId, changes: Object.keys(data) }
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      branchId: updated.branchId,
      role: updated.role,
      pharmacyRoleId: updated.pharmacyRoleId,
      pharmacyRoleName: updated.role === "COMPANY_OWNER" ? "Pharmacy Owner" : updated.pharmacyRole?.name || updated.pharmacyRoleName,
      permissions: updated.role === "COMPANY_OWNER" ? ["*"] : updated.pharmacyRole?.permissions?.length ? updated.pharmacyRole.permissions : updated.permissions || [],
      username: updated.username,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
      branch: updated.branch
    };
  }
  static async updateUserStatus(userId, tenantId, updaterId, updaterRole, isActive) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role === "COMPANY_OWNER") {
      throw new Error("Pharmacy Owner account cannot be deactivated.");
    }
    if (user.id === updaterId && !isActive) {
      throw new Error("You cannot deactivate your own account.");
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true
      }
    });
    await AuditService.log({
      tenantId,
      branchId: user.branchId,
      userId: updaterId,
      action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
      details: { targetUserId: userId, username: user.username }
    });
    return updated;
  }
  static async deleteUser(userId, tenantId, deleterId, deleterRole) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });
    if (!user) {
      throw new Error("Staff member not found in your pharmacy.");
    }
    if (user.role === "COMPANY_OWNER") {
      throw new Error("Pharmacy Owner account cannot be deleted.");
    }
    if (user.id === deleterId) {
      throw new Error("You cannot delete your own account.");
    }
    await prisma.user.delete({
      where: { id: userId }
    });
    await AuditService.log({
      tenantId,
      branchId: user.branchId,
      userId: deleterId,
      action: "USER_DELETE",
      details: { deletedUserId: userId, username: user.username, name: user.name, role: user.pharmacyRoleName || user.role }
    });
    return {
      success: true,
      message: `Staff member "${user.name || user.username}" deleted successfully.`
    };
  }
  static async getPermissionsHierarchy(tenantId) {
    await this.ensureDefaultRoles(tenantId);
    const roles = await this.listPharmacyRoles(tenantId);
    const permissionMap = {};
    roles.forEach((r) => {
      permissionMap[r.id] = r.permissions || [];
      permissionMap[r.name] = r.permissions || [];
    });
    return {
      roles,
      activePermissions: permissionMap,
      allPermissions: ALL_PHARMACY_PERMISSIONS
    };
  }
  static async changePassword(userId, data) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      throw new Error("User not found.");
    }
    const isValid = await bcrypt3.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password does not match.");
    }
    const newHash = await bcrypt3.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });
    return { success: true, message: "Password updated successfully." };
  }
  static async updateProfile(userId, data) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data.name !== void 0 && { name: data.name },
        ...data.phone !== void 0 && { phone: data.phone },
        ...data.email !== void 0 && { email: data.email },
        ...data.avatarUrl !== void 0 && { avatarUrl: data.avatarUrl }
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true
      }
    });
    return updated;
  }
};

// src/modules/user/user.controller.ts
var UserController = class {
  /**
   * ==================== PHARMACY ROLE CONTROLLERS ====================
   */
  static async listRoles(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const roles = await UserService.listPharmacyRoles(tenantId);
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async createRole(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const role = await UserService.createPharmacyRole(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Role created successfully",
        data: role
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const role = await UserService.updatePharmacyRole(tenantId, id, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Role updated successfully",
        data: role
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await UserService.deletePharmacyRole(tenantId, id, userId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getPermissionsHierarchy(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const permissions = await UserService.getPermissionsHierarchy(tenantId);
      res.status(200).json({ success: true, data: permissions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async updateRolePermissions(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { role, permissions } = req.body;
      const roles = await UserService.listPharmacyRoles(tenantId);
      const matched = roles.find((r) => r.id === role || r.name === role);
      if (matched) {
        const updated = await UserService.updatePharmacyRole(tenantId, matched.id, userId, { permissions });
        res.status(200).json({ success: true, message: `Permissions updated for role "${matched.name}"`, data: updated });
      } else {
        res.status(404).json({ success: false, message: "Role not found" });
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async batchUpdateRolePermissions(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { matrix } = req.body;
      const updated = await UserService.batchUpdateRolePermissions(tenantId, userId, matrix);
      res.status(200).json({ success: true, message: "Permission matrix updated successfully", data: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  /**
   * ==================== PHARMACY STAFF CONTROLLERS ====================
   */
  static async createUser(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const creatorId = req.user.id;
      const creatorRole = req.user.role;
      const user = await UserService.createUser(tenantId, creatorId, creatorRole, req.body);
      res.status(201).json({
        success: true,
        message: "Staff member created successfully",
        data: user
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listUsers(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await UserService.listUsers(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const user = await UserService.getUserDetails(id, tenantId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const updaterId = req.user.id;
      const updaterRole = req.user.role;
      const updated = await UserService.updateUser(id, tenantId, updaterId, updaterRole, req.body);
      res.status(200).json({
        success: true,
        message: "Staff member updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const tenantId = req.user.tenantId;
      const updaterId = req.user.id;
      const updaterRole = req.user.role;
      const updated = await UserService.updateUserStatus(id, tenantId, updaterId, updaterRole, isActive);
      res.status(200).json({
        success: true,
        message: `Staff member ${isActive ? "activated" : "deactivated"} successfully`,
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const deleterId = req.user.id;
      const deleterRole = req.user.role;
      const result = await UserService.deleteUser(id, tenantId, deleterId, deleterRole);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const result = await UserService.changePassword(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updated = await UserService.updateProfile(userId, req.body);
      res.status(200).json({ success: true, data: updated, message: "Profile updated successfully" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/modules/user/user.validation.ts
import { z as z7 } from "zod";
var RoleEnum = z7.enum([
  "SUPER_ADMIN",
  "COMPANY_OWNER",
  "REGIONAL_ADMIN",
  "BRANCH_MANAGER",
  "MANAGER",
  "INVENTORY_EXECUTIVE",
  "CASHIER",
  "ACCOUNTS",
  "AUDITOR",
  "CTO",
  "PROJECT_MANAGER"
]);
var createUserSchema = z7.object({
  username: z7.string().min(3, "Username must be at least 3 characters").optional(),
  password: z7.string().min(6, "Password must be at least 6 characters"),
  name: z7.string().min(2, "Name must be at least 2 characters").optional(),
  email: z7.string().email("Invalid email format").optional(),
  phone: z7.string().optional(),
  role: z7.string().min(1, "Role is required"),
  branchId: z7.string().nullable().optional()
});
var updateUserSchema = z7.object({
  name: z7.string().min(2).optional(),
  email: z7.string().email().optional(),
  phone: z7.string().optional(),
  role: z7.string().optional(),
  branchId: z7.string().nullable().optional(),
  password: z7.string().min(6).optional(),
  isActive: z7.boolean().optional()
});
var createPharmacyRoleSchema = z7.object({
  name: z7.string().min(2, "Role name must be at least 2 characters"),
  description: z7.string().optional(),
  permissions: z7.array(z7.string()).default([]),
  isActive: z7.boolean().optional()
});
var updatePharmacyRoleSchema = z7.object({
  name: z7.string().min(2).optional(),
  description: z7.string().optional(),
  permissions: z7.array(z7.string()).optional(),
  isActive: z7.boolean().optional()
});
var updateRolePermissionsSchema = z7.object({
  role: z7.string(),
  permissions: z7.array(z7.string())
});
var batchUpdateRolePermissionsSchema = z7.object({
  matrix: z7.array(
    z7.object({
      roleId: z7.string(),
      permissions: z7.array(z7.string())
    })
  )
});
var listUsersQuerySchema = z7.object({
  page: z7.union([z7.string(), z7.number()]).optional().transform((v) => v ? parseInt(String(v), 10) : 1),
  limit: z7.union([z7.string(), z7.number()]).optional().transform((v) => v ? parseInt(String(v), 10) : 50),
  search: z7.string().optional(),
  role: z7.string().optional(),
  branchId: z7.string().optional().transform((v) => v === "" || v === "null" || v === "undefined" ? void 0 : v),
  isActive: z7.union([z7.string(), z7.boolean()]).optional().transform((v) => v === "true" || v === true ? true : v === "false" || v === false ? false : void 0)
});
var changePasswordSchema = z7.object({
  currentPassword: z7.string().min(1, "Current password is required"),
  newPassword: z7.string().min(6, "New password must be at least 6 characters")
});
var updateProfileSchema = z7.object({
  name: z7.string().min(2).optional(),
  phone: z7.string().optional().nullable(),
  email: z7.string().email().optional().nullable(),
  avatarUrl: z7.string().optional().nullable()
});

// src/modules/user/user.routes.ts
var router7 = Router7();
router7.use(authenticate, requireActiveSubscription);
router7.post(
  "/change-password",
  validateRequest({ body: changePasswordSchema }),
  UserController.changePassword
);
router7.patch(
  "/profile",
  validateRequest({ body: updateProfileSchema }),
  UserController.updateProfile
);
router7.get("/roles", requirePermission("roles.manage"), UserController.listRoles);
router7.post(
  "/roles",
  requirePermission("roles.manage"),
  validateRequest({ body: createPharmacyRoleSchema }),
  UserController.createRole
);
router7.post(
  "/roles/matrix",
  requirePermission("roles.manage"),
  validateRequest({ body: batchUpdateRolePermissionsSchema }),
  UserController.batchUpdateRolePermissions
);
router7.patch(
  "/roles/:id",
  requirePermission("roles.manage"),
  validateRequest({ body: updatePharmacyRoleSchema }),
  UserController.updateRole
);
router7.delete(
  "/roles/:id",
  requirePermission("roles.manage"),
  UserController.deleteRole
);
router7.get("/roles/permissions", requirePermission("roles.manage"), UserController.getPermissionsHierarchy);
router7.post(
  "/roles/permissions",
  requirePermission("roles.manage"),
  validateRequest({ body: updateRolePermissionsSchema }),
  UserController.updateRolePermissions
);
router7.get("/", requirePermission("staff.view"), validateRequest({ query: listUsersQuerySchema }), UserController.listUsers);
router7.get("/:id", requirePermission("staff.view"), UserController.getUserDetails);
router7.post(
  "/",
  requirePermission("staff.manage"),
  checkStaffLimit,
  validateRequest({ body: createUserSchema }),
  UserController.createUser
);
router7.patch(
  "/:id",
  requirePermission("staff.manage"),
  validateRequest({ body: updateUserSchema }),
  UserController.updateUser
);
router7.patch(
  "/:id/status",
  requirePermission("staff.manage"),
  UserController.updateUserStatus
);
router7.delete(
  "/:id",
  requirePermission("staff.manage"),
  UserController.deleteUser
);

// src/modules/product/product.routes.ts
import { Router as Router8 } from "express";

// src/modules/product/product.controller.ts
var ProductController = class {
  // ==================== CATEGORIES ====================
  static async listCategories(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const categories = await ProductService.listCategories(tenantId);
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async createCategory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const category = await ProductService.createCategory(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const category = await ProductService.updateCategory(id, tenantId, userId, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await ProductService.deleteCategory(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  // ==================== BRANDS ====================
  static async listBrands(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const brands = await ProductService.listBrands(tenantId);
      res.status(200).json({ success: true, data: brands });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async createBrand(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const brand = await ProductService.createBrand(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateBrand(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const brand = await ProductService.updateBrand(id, tenantId, userId, req.body);
      res.status(200).json({ success: true, data: brand });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteBrand(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await ProductService.deleteBrand(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  // ==================== UNITS ====================
  static async listUnits(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const units = await ProductService.listUnits(tenantId);
      res.status(200).json({ success: true, data: units });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async createUnit(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const unit = await ProductService.createUnit(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: unit });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  // ==================== PRODUCTS ====================
  static async createProduct(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const product = await ProductService.createProduct(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listProducts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      if (!query.branchId && req.user?.branchId) {
        query.branchId = req.user.branchId;
      }
      const result = await ProductService.listProducts(tenantId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId || req.user?.branchId || void 0;
      const product = await ProductService.getProductById(id, tenantId, branchId);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async getProductByBarcode(req, res) {
    try {
      const { barcode } = req.params;
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId || req.user?.branchId || void 0;
      const product = await ProductService.getProductByBarcode(barcode, tenantId, branchId);
      res.status(200).json({ success: true, data: product });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const updated = await ProductService.updateProduct(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await ProductService.deleteProduct(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async bulkImport(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await ProductService.bulkImport(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: `Successfully processed ${result.totalProcessed} products (${result.createdCount} created, ${result.updatedCount} updated)`,
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updatePricing(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { basePrice } = req.body;
      const updated = await ProductService.updateBasePrice(id, tenantId, userId, basePrice);
      res.status(200).json({
        success: true,
        message: "Base price updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async setBranchPriceOverride(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const override = await ProductService.setBranchPriceOverride(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Branch price override set successfully",
        data: override
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async removeBranchPriceOverride(req, res) {
    try {
      const { id, branchId } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await ProductService.removeBranchPriceOverride(id, branchId, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/modules/product/product.validation.ts
import { z as z8 } from "zod";
var createCategorySchema = z8.object({
  name: z8.string().min(2, "Category name must be at least 2 characters"),
  parentId: z8.string().optional().nullable(),
  productType: z8.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
  defaultUnit: z8.string().optional().nullable(),
  description: z8.string().optional().nullable(),
  isActive: z8.boolean().optional().default(true),
  subcategories: z8.array(z8.string().min(1)).optional()
});
var updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z8.boolean().optional()
});
var createBrandSchema = z8.object({
  name: z8.string().min(2, "Brand name must be at least 2 characters"),
  description: z8.string().optional().nullable()
});
var updateBrandSchema = createBrandSchema.partial().extend({
  isActive: z8.boolean().optional()
});
var createUnitSchema = z8.object({
  name: z8.string().min(1, "Unit name is required"),
  symbol: z8.string().min(1, "Unit symbol is required"),
  productType: z8.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable()
});
var updateUnitSchema = createUnitSchema.partial().extend({
  isActive: z8.boolean().optional()
});
var createProductSchema = z8.object({
  name: z8.string().min(2, "Product name must be at least 2 characters"),
  genericName: z8.string().optional().nullable(),
  sku: z8.string().optional().nullable(),
  barcode: z8.string().optional().nullable(),
  basePrice: z8.number().min(0, "Base price cannot be negative").optional().default(0),
  category: z8.string().optional().nullable(),
  categoryId: z8.string().optional().nullable(),
  subcategory: z8.string().optional().nullable(),
  subcategoryId: z8.string().optional().nullable(),
  brandId: z8.string().optional().nullable(),
  unitId: z8.string().optional().nullable(),
  productType: z8.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
  brandName: z8.string().optional().nullable(),
  manufacturer: z8.string().optional().nullable(),
  unit: z8.string().default("piece"),
  size: z8.string().optional().nullable(),
  defaultPackType: z8.string().default("BOX"),
  qtyPerLevel2: z8.number().int().positive().optional().nullable(),
  qtyPerLevel3: z8.number().int().positive().optional().nullable(),
  qtyPerLevel4: z8.number().int().positive().optional().nullable(),
  stripsPerBox: z8.number().int().positive().optional().nullable(),
  tabletsPerStrip: z8.number().int().positive().optional().nullable(),
  minStockAlert: z8.number().int().nonnegative().optional().default(10),
  description: z8.string().optional().nullable(),
  isControlled: z8.boolean().optional().default(false),
  requiresPrescription: z8.boolean().default(false)
});
var updateProductSchema = createProductSchema.partial().extend({
  isActive: z8.boolean().optional()
});
var bulkProductSchema = z8.object({
  products: z8.array(createProductSchema).min(1, "Must provide at least one product")
});
var updatePricingSchema = z8.object({
  basePrice: z8.number().positive("Base price must be greater than 0")
});
var branchPriceOverrideSchema = z8.object({
  branchId: z8.string().min(1, "Branch ID is required"),
  price: z8.number().positive("Branch price must be greater than 0")
});
var listProductsQuerySchema = z8.object({
  page: z8.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z8.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  search: z8.string().optional(),
  category: z8.string().optional(),
  categoryId: z8.string().optional(),
  subcategory: z8.string().optional(),
  subcategoryId: z8.string().optional(),
  brandId: z8.string().optional(),
  productType: z8.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional(),
  isControlled: z8.string().optional().transform((v) => v === "true" ? true : v === "false" ? false : void 0),
  requiresPrescription: z8.string().optional().transform((v) => v === "true" ? true : v === "false" ? false : void 0),
  isActive: z8.string().optional().transform((v) => v === "true" ? true : v === "false" ? false : void 0),
  branchId: z8.string().optional()
});

// src/modules/product/product.routes.ts
var router8 = Router8();
router8.use(authenticate, requireActiveSubscription);
router8.get(
  ["/categories", "/variants/categories"],
  requirePermission("category.manage"),
  ProductController.listCategories
);
router8.post(
  ["/categories", "/variants/categories"],
  requirePermission("category.manage"),
  validateRequest({ body: createCategorySchema }),
  ProductController.createCategory
);
router8.patch(
  ["/categories/:id", "/variants/categories/:id"],
  requirePermission("category.manage"),
  validateRequest({ body: updateCategorySchema }),
  ProductController.updateCategory
);
router8.delete(
  ["/categories/:id", "/variants/categories/:id"],
  requirePermission("category.manage"),
  ProductController.deleteCategory
);
router8.get(
  ["/brands", "/variants/brands"],
  requirePermission("inventory.product_list"),
  ProductController.listBrands
);
router8.post(
  ["/brands", "/variants/brands"],
  requirePermission("inventory.add_product"),
  validateRequest({ body: createBrandSchema }),
  ProductController.createBrand
);
router8.patch(
  ["/brands/:id", "/variants/brands/:id"],
  requirePermission("inventory.product_list"),
  validateRequest({ body: updateBrandSchema }),
  ProductController.updateBrand
);
router8.delete(
  ["/brands/:id", "/variants/brands/:id"],
  requirePermission("inventory.product_list"),
  ProductController.deleteBrand
);
router8.get(
  "/units",
  requirePermission("inventory.product_list"),
  ProductController.listUnits
);
router8.post(
  "/units",
  requirePermission("inventory.add_product"),
  validateRequest({ body: createUnitSchema }),
  ProductController.createUnit
);
router8.get(
  "/",
  requirePermission("inventory.product_list"),
  validateRequest({ query: listProductsQuerySchema }),
  ProductController.listProducts
);
router8.get(
  "/barcode/:barcode",
  requirePermission("inventory.product_list"),
  ProductController.getProductByBarcode
);
router8.get(
  "/:id",
  requirePermission("inventory.product_list"),
  ProductController.getProductById
);
router8.post(
  "/",
  requirePermission("inventory.add_product"),
  validateRequest({ body: createProductSchema }),
  ProductController.createProduct
);
router8.post(
  "/bulk",
  requirePermission("inventory.add_product"),
  validateRequest({ body: bulkProductSchema }),
  ProductController.bulkImport
);
router8.patch(
  "/:id",
  requirePermission("inventory.product_list"),
  validateRequest({ body: updateProductSchema }),
  ProductController.updateProduct
);
router8.delete(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.deleteProduct
);
router8.patch(
  "/:id/price",
  requirePermission("inventory.product_list"),
  validateRequest({ body: updatePricingSchema }),
  ProductController.updatePricing
);
router8.post(
  "/:id/branch-price",
  requirePermission("inventory.product_list"),
  validateRequest({ body: branchPriceOverrideSchema }),
  ProductController.setBranchPriceOverride
);
router8.delete(
  "/:id/branch-price/:branchId",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.removeBranchPriceOverride
);
var productRoutes = router8;

// src/modules/inventory/inventory.routes.ts
import { Router as Router9 } from "express";

// src/modules/inventory/inventory.service.ts
var InventoryService = class _InventoryService {
  /**
   * Complete hierarchical packaging derivation with 4-tier cascade:
   * Tier 1: Inward Receiving records
   * Tier 2: Explicit batch columns (cartonsReceived, looseBoxesReceived)
   * Tier 3: Batch carton & box quantities (cartonQuantity, boxQuantity)
   * Tier 4: Base units fallback (quantity / initialQuantity)
   * Guarantees zero double-counting, isolates cartons vs loose boxes,
   * handles physical location allocations cleanly.
   */
  static calculateBatchPackagingMetrics(inv) {
    const isBottle = inv.packageType === "BOTTLE" || inv.packageType === "SYRUP" || inv.product?.unit === "bottle" || inv.product?.defaultPackType === "BOTTLE" || inv.product?.productType === "SYRUP" || inv.product?.category === "Syrup";
    const isMedicine = !isBottle && (inv.packageType === "MEDICINE" || inv.product?.productType === "MEDICINE" || inv.product?.category === "Medicine" || !inv.product?.productType || Boolean(inv.stripsPerBox && inv.tabletsPerStrip));
    const stripsPerBox = isBottle ? 1 : Math.max(1, inv.stripsPerBox || inv.product?.stripsPerBox || 10);
    const tabletsPerStrip = isBottle ? 1 : Math.max(1, inv.tabletsPerStrip || inv.product?.tabletsPerStrip || 10);
    const tabletsPerBox = isMedicine ? stripsPerBox * tabletsPerStrip : 1;
    const boxesPerCarton = Math.max(1, inv.boxesPerCarton || inv.product?.qtyPerLevel2 || (isBottle ? inv.product?.stripsPerBox || 12 : 10));
    const tabletsPerCarton = boxesPerCarton * tabletsPerBox;
    let recCartons = 0;
    let recLooseBoxes = 0;
    let hasReceivingRecords = false;
    if (Array.isArray(inv.receivingRecords) && inv.receivingRecords.length > 0) {
      hasReceivingRecords = true;
      for (const rec of inv.receivingRecords) {
        if (rec.receivingUnit === "BOX") {
          recLooseBoxes += Number(rec.boxesReceived) || 0;
        } else {
          recCartons += Number(rec.cartonsReceived) || 0;
        }
      }
    }
    let cartonsReceived = 0;
    let looseBoxesReceived = 0;
    if (hasReceivingRecords && (recCartons > 0 || recLooseBoxes > 0)) {
      cartonsReceived = recCartons;
      looseBoxesReceived = recLooseBoxes;
    } else if (Number(inv.cartonsReceived) > 0 || Number(inv.looseBoxesReceived) > 0) {
      cartonsReceived = Number(inv.cartonsReceived) || 0;
      looseBoxesReceived = Number(inv.looseBoxesReceived) || 0;
    } else if (Number(inv.cartonQuantity) > 0 || Number(inv.boxQuantity) > 0) {
      if (Number(inv.cartonQuantity) > 0) {
        cartonsReceived = Number(inv.cartonQuantity) + (Number(inv.allocatedCartons) || 0);
        looseBoxesReceived = Math.max(
          0,
          (Number(inv.boxQuantity) || 0) - Number(inv.cartonQuantity) * boxesPerCarton
        ) + (Number(inv.allocatedLooseBoxes) || 0);
      } else {
        cartonsReceived = 0;
        looseBoxesReceived = (Number(inv.boxQuantity) || 0) + (Number(inv.allocatedLooseBoxes) || 0);
      }
    } else {
      const totalUnits = Math.max(0, Number(inv.initialQuantity) || Number(inv.quantity) || 0);
      const totalBoxes = Math.floor(totalUnits / tabletsPerBox);
      cartonsReceived = Math.floor(totalBoxes / boxesPerCarton);
      looseBoxesReceived = totalBoxes % boxesPerCarton;
    }
    const totalAllocated = (inv.locations || []).reduce(
      (sum, loc) => sum + (Number(loc.quantity) || 0),
      0
    );
    const totalAllocatedBoxes = Math.floor(totalAllocated / tabletsPerBox);
    let allocatedLooseBoxes = Math.max(0, Number(inv.allocatedLooseBoxes) || 0);
    let boxesAllocatedFromCarton = Math.max(0, Number(inv.boxesAllocatedFromCarton) || 0);
    let allocatedCartons = Math.max(0, Number(inv.allocatedCartons) || 0);
    if (boxesAllocatedFromCarton === 0 && allocatedCartons > 0) {
      boxesAllocatedFromCarton = allocatedCartons * boxesPerCarton;
    }
    if (allocatedCartons === 0 && allocatedLooseBoxes === 0 && boxesAllocatedFromCarton === 0 && totalAllocated > 0) {
      allocatedLooseBoxes = Math.min(looseBoxesReceived, totalAllocatedBoxes);
      const remainingAllocatedBoxes = totalAllocatedBoxes - allocatedLooseBoxes;
      boxesAllocatedFromCarton = Math.min(cartonsReceived * boxesPerCarton, remainingAllocatedBoxes);
      allocatedCartons = Math.min(cartonsReceived, Math.ceil(boxesAllocatedFromCarton / boxesPerCarton));
    }
    const currentQuantity = Math.max(0, Number(inv.quantity) || 0);
    const unallocatedBulk = Math.max(0, currentQuantity - totalAllocated);
    const cartonsOpened = Math.ceil(boxesAllocatedFromCarton / boxesPerCarton);
    let fullCartons = Math.max(0, cartonsReceived - cartonsOpened);
    if (inv.cartonQuantity !== void 0 && inv.cartonQuantity !== null && Number(inv.cartonQuantity) >= 0) {
      fullCartons = Math.min(fullCartons, Number(inv.cartonQuantity));
    }
    fullCartons = Math.min(fullCartons, Math.floor(unallocatedBulk / tabletsPerCarton));
    const boxesInsideCartons = fullCartons * boxesPerCarton;
    const boxesRemovedFromCarton = boxesAllocatedFromCarton;
    const boxesInOpenCarton = cartonsOpened > 0 ? Math.max(0, cartonsOpened * boxesPerCarton - boxesAllocatedFromCarton) : 0;
    const totalCartonBoxesAvailable = boxesInsideCartons + boxesInOpenCarton;
    let remainingLooseBoxes = Math.max(0, looseBoxesReceived - allocatedLooseBoxes);
    remainingLooseBoxes = Math.min(remainingLooseBoxes, Math.floor(unallocatedBulk / tabletsPerBox));
    if (cartonsReceived === 0 && looseBoxesReceived === 0) {
      remainingLooseBoxes = Math.floor(unallocatedBulk / tabletsPerBox);
    }
    const totalEquivalentBoxes = totalCartonBoxesAvailable + remainingLooseBoxes;
    const bulkUnitsAfterBoxes = Math.max(0, unallocatedBulk - totalEquivalentBoxes * tabletsPerBox);
    const unboxedStrips = Math.floor(bulkUnitsAfterBoxes / tabletsPerStrip);
    const unboxedTablets = bulkUnitsAfterBoxes % tabletsPerStrip;
    const totalStrips = totalEquivalentBoxes * stripsPerBox + unboxedStrips;
    const totalTablets = totalEquivalentBoxes * tabletsPerBox + bulkUnitsAfterBoxes;
    const formulaText = isBottle ? `${fullCartons} Full Carton${fullCartons !== 1 ? "s" : ""} \xD7 ${boxesPerCarton} Bottles = ${boxesInsideCartons} Bottles Inside Cartons + ${remainingLooseBoxes} Loose Bottle${remainingLooseBoxes !== 1 ? "s" : ""} = ${totalEquivalentBoxes} Total Bottles` : `${fullCartons} Full Carton${fullCartons !== 1 ? "s" : ""} \xD7 ${boxesPerCarton} Boxes = ${boxesInsideCartons} Boxes Inside Cartons + ${remainingLooseBoxes} Loose Box${remainingLooseBoxes !== 1 ? "es" : ""} = ${totalEquivalentBoxes} Total Boxes`;
    return {
      stripsPerBox,
      tabletsPerStrip,
      tabletsPerBox,
      boxesPerCarton,
      tabletsPerCarton,
      cartonsReceived,
      looseBoxesReceived,
      allocatedCartons,
      allocatedLooseBoxes,
      boxesAllocatedFromCarton,
      boxesRemovedFromCarton,
      boxesInOpenCarton,
      totalCartonBoxesAvailable,
      fullCartons,
      boxesInsideCartons,
      remainingLooseBoxes,
      totalEquivalentBoxes,
      totalStrips,
      totalTablets,
      unboxedStrips,
      unboxedTablets,
      remainingStrips: unboxedStrips,
      remainingTablets: unboxedTablets,
      formulaText,
      totalAllocated,
      unallocatedBulk,
      isMedicine
    };
  }
  /**
   * List Batch Inventory for a Branch with Supplier & Expiry data
   */
  static async getBranchInventory(tenantId, branchId, query) {
    const isAll = !branchId || branchId === "all" || branchId === "all-branches";
    let branch = null;
    if (!isAll) {
      branch = await prisma.branch.findFirst({
        where: { id: branchId, tenantId, isActive: true }
      });
      if (!branch) {
        throw new Error("Branch not found");
      }
    }
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
      product: { tenantId, isActive: true }
    };
    if (!isAll && branchId) {
      where.branchId = branchId;
    } else {
      where.branch = { tenantId, isActive: true };
    }
    if (query.category) {
      where.product.category = { equals: query.category, mode: "insensitive" };
    }
    if (query.search) {
      where.OR = [
        { batchNumber: { contains: query.search, mode: "insensitive" } },
        { barcode: { contains: query.search, mode: "insensitive" } },
        { product: { name: { contains: query.search, mode: "insensitive" } } },
        { product: { genericName: { contains: query.search, mode: "insensitive" } } },
        { product: { sku: { contains: query.search, mode: "insensitive" } } },
        { product: { barcode: { contains: query.search, mode: "insensitive" } } },
        { product: { brandName: { contains: query.search, mode: "insensitive" } } },
        { product: { manufacturer: { contains: query.search, mode: "insensitive" } } }
      ];
    }
    const [total, inventories] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ expiryDate: "asc" }, { updatedAt: "desc" }],
        include: {
          branch: {
            select: { id: true, name: true, location: true }
          },
          product: {
            include: {
              ...!isAll && branchId ? { branchOverrides: { where: { branchId } } } : {},
              categoryRef: true,
              brandRef: true,
              unitRef: true
            }
          },
          supplier: {
            select: { id: true, name: true, phone: true }
          },
          locations: {
            where: { quantity: { gt: 0 } },
            include: {
              rack: true,
              shelf: true,
              bin: true
            }
          },
          receivingRecords: {
            orderBy: { receivedDate: "desc" },
            include: {
              supplier: {
                select: { id: true, name: true, phone: true }
              }
            }
          }
        }
      })
    ]);
    const now = /* @__PURE__ */ new Date();
    const formatted = inventories.map((inv) => {
      const override = inv.product.branchOverrides && inv.product.branchOverrides[0];
      const isLowStock = inv.quantity <= (inv.lowStockThreshold || inv.minStockLevel || 5);
      const isExpired = inv.expiryDate ? new Date(inv.expiryDate) < now : false;
      const daysUntilExpiry = inv.expiryDate ? Math.ceil((new Date(inv.expiryDate).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : null;
      const metrics = _InventoryService.calculateBatchPackagingMetrics(inv);
      const {
        stripsPerBox,
        tabletsPerStrip,
        tabletsPerBox,
        boxesPerCarton,
        fullCartons,
        boxesInsideCartons,
        remainingLooseBoxes,
        totalEquivalentBoxes
      } = metrics;
      const formattedLocations = (inv.locations || []).map((loc) => {
        const rackName = loc.rack?.name || "\u2014";
        const shelfName = loc.shelf?.name || "\u2014";
        const binName = loc.bin?.name || "\u2014";
        const qty = loc.quantity || 0;
        const fullBoxes = Math.floor(qty / tabletsPerBox);
        const looseTablets = qty % tabletsPerBox;
        const openBoxes = looseTablets > 0 ? 1 : 0;
        const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
        const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
        const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
        const locationLabel = parts.length > 0 ? parts.join(" \u2192 ") : "General Shelf";
        const stockParts = [];
        if (fullBoxes > 0) stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
        if (openBoxRemainingStrips > 0)
          stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
        if (openBoxRemainingTablets > 0)
          stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
        if (stockParts.length === 0) stockParts.push(`${qty} ${inv.product.unit || "units"}`);
        const displayText = stockParts.join(", ");
        return {
          ...loc,
          rackName,
          shelfName,
          binName,
          locationLabel,
          fullBoxes,
          looseTablets,
          openBoxes,
          strips: openBoxRemainingStrips,
          tablets: openBoxRemainingTablets,
          openBoxRemainingStrips,
          openBoxRemainingTablets,
          displayText,
          stripsPerBox,
          tabletsPerStrip,
          tabletsPerBox,
          unit: inv.product.unit || "tablet"
        };
      });
      return {
        id: inv.id,
        branchId: inv.branchId,
        branch: inv.branch || (branch ? { id: branch.id, name: branch.name, location: branch.location } : void 0),
        productId: inv.productId,
        productName: inv.product.name,
        genericName: inv.product.genericName,
        sku: inv.product.sku,
        barcode: inv.barcode || inv.product.barcode,
        category: inv.product.category,
        subcategory: inv.product.subcategory,
        brandName: inv.product.brandName || inv.product.manufacturer,
        unit: inv.product.unit,
        size: inv.product.size,
        basePrice: Number(inv.product.basePrice),
        sellingPrice: inv.sellingPrice ? Number(inv.sellingPrice) : override ? Number(override.price) : Number(inv.product.basePrice),
        purchasePrice: inv.purchasePrice ? Number(inv.purchasePrice) : null,
        hasPriceOverride: !!override,
        isControlled: inv.product.isControlled,
        requiresPrescription: inv.product.requiresPrescription,
        quantity: inv.quantity,
        initialQuantity: inv.initialQuantity,
        batchNumber: inv.batchNumber,
        mfgDate: inv.mfgDate,
        expiryDate: inv.expiryDate,
        packageType: inv.packageType || inv.product.category || "Medicine",
        cartonQuantity: fullCartons,
        ...metrics,
        boxQuantity: totalEquivalentBoxes,
        packLevel1: inv.product.packLevel1,
        packLevel2: inv.product.packLevel2,
        packLevel3: inv.product.packLevel3,
        packLevel4: inv.product.packLevel4,
        qtyPerLevel2: inv.product.qtyPerLevel2,
        qtyPerLevel3: inv.product.qtyPerLevel3,
        qtyPerLevel4: inv.product.qtyPerLevel4,
        shelfLocation: inv.shelfLocation || inv.product.shelfLocation,
        minStockLevel: inv.minStockLevel,
        lowStockThreshold: inv.lowStockThreshold,
        isLowStock,
        isExpired,
        daysUntilExpiry,
        isNearExpiry: daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry >= 0,
        supplier: inv.supplier,
        receivedDate: inv.receivedDate || inv.createdAt,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        locations: formattedLocations,
        receivingRecords: inv.receivingRecords || [],
        product: inv.product
      };
    });
    return {
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Inward Stock / Add Batch for a Product
   */
  static async inwardStock(tenantId, userId, data) {
    const [branch, product] = await Promise.all([
      prisma.branch.findFirst({ where: { id: data.branchId, tenantId, isActive: true } }),
      prisma.product.findFirst({ where: { id: data.productId, tenantId, isActive: true } })
    ]);
    if (!branch) throw new Error("Branch not found or inactive");
    if (!product) throw new Error("Product not found or inactive");
    let supplier = null;
    let contactPersonName = data.contactPersonName || null;
    if (data.supplierId) {
      supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId }
      });
      if (!supplier) throw new Error("Supplier not found");
      if (data.contactPersonId) {
        const cp = await prisma.supplierContact.findFirst({
          where: { id: data.contactPersonId, tenantId }
        });
        if (cp) {
          contactPersonName = cp.name;
        }
      } else if (supplier.contactPerson) {
        contactPersonName = supplier.contactPerson;
      }
    }
    const mfgDate = data.mfgDate ? new Date(data.mfgDate) : null;
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    const receivedDate = data.receivedDate ? new Date(data.receivedDate) : /* @__PURE__ */ new Date();
    const result = await prisma.$transaction(async (tx) => {
      const unit = (product.unit || "").toLowerCase();
      const defaultPack = (product.defaultPackType || "").toUpperCase();
      const pType = (product.productType || "").toUpperCase();
      const cat = (product.category || "").toLowerCase();
      const reqPack = (data.packageType || "").toUpperCase();
      const name = (product.name || "").toLowerCase();
      const generic = (product.genericName || "").toLowerCase();
      let packagingModel = "TABLET";
      if (defaultPack === "BOTTLE" || reqPack === "BOTTLE" || unit === "bottle" || pType === "SYRUP" || cat.includes("syrup") || cat.includes("liquid") || cat.includes("suspension") || cat.includes("drop") || cat.includes("tonic")) {
        packagingModel = "BOTTLE";
      } else if (defaultPack === "VIAL" || reqPack === "VIAL" || unit === "vial" || unit === "ampoule" || pType === "SALINE" || cat.includes("inject") || cat.includes("vial") || cat.includes("ampoule") || cat.includes("saline") || cat.includes("infusion") || name.includes("injection") || name.includes("vial") || name.includes("ampoule") || generic.includes("injection") || generic.includes("vial")) {
        packagingModel = "VIAL";
      } else if (defaultPack === "PIECE" || reqPack === "PIECE" || unit === "piece" || unit === "pack" || unit === "unit" || unit === "pcs" || pType === "EQUIPMENT" || cat.includes("diaper") || cat.includes("equip") || cat.includes("device") || cat.includes("care") || cat.includes("surgical") || cat.includes("hygiene") || name.includes("diaper") || generic.includes("diaper") || name.includes("syringe") || generic.includes("syringe")) {
        packagingModel = "PIECE";
      }
      const isBottle = packagingModel === "BOTTLE";
      const isPiece = packagingModel === "PIECE";
      const isVial = packagingModel === "VIAL";
      const isTablet = packagingModel === "TABLET";
      const isBoxReceiving = data.receivingUnit === "BOX";
      const boxesPerCarton = data.boxesPerCarton || product.qtyPerLevel2 || (isBottle ? product.stripsPerBox || 12 : 10);
      const piecesOrVialsPerBox = product.stripsPerBox || data.stripsPerBox || 1;
      const stripsPerBox = isTablet ? product.stripsPerBox || data.stripsPerBox || 10 : isPiece || isVial ? piecesOrVialsPerBox : 1;
      const tabletsPerStrip = isTablet ? product.tabletsPerStrip || data.tabletsPerStrip || 10 : 1;
      const unitsPerBox = isBottle ? 1 : isTablet ? stripsPerBox * tabletsPerStrip : piecesOrVialsPerBox;
      let cartonsReceived = 0;
      let boxesReceived = 0;
      let looseBoxesReceived = 0;
      if (isBoxReceiving) {
        boxesReceived = data.boxesReceived ?? data.boxQuantity ?? Math.max(1, Math.round(data.quantity / unitsPerBox));
        looseBoxesReceived = boxesReceived;
      } else {
        cartonsReceived = data.cartonsReceived ?? data.cartonQuantity ?? Math.max(1, Math.round(data.quantity / (boxesPerCarton * unitsPerBox)));
        boxesReceived = cartonsReceived * boxesPerCarton;
      }
      let boxPurchasePrice = data.boxPurchasePrice !== void 0 && data.boxPurchasePrice !== null ? Number(data.boxPurchasePrice) : null;
      let purchasePrice = data.purchasePrice !== void 0 && data.purchasePrice !== null ? Number(data.purchasePrice) : null;
      if (isBottle) {
        if (purchasePrice === null && boxPurchasePrice !== null) purchasePrice = boxPurchasePrice;
        if (boxPurchasePrice === null && purchasePrice !== null) boxPurchasePrice = purchasePrice;
      } else {
        if (boxPurchasePrice !== null && purchasePrice === null) {
          purchasePrice = unitsPerBox > 0 ? Math.round(boxPurchasePrice / unitsPerBox * 100) / 100 : 0;
        } else if (purchasePrice !== null && boxPurchasePrice === null) {
          boxPurchasePrice = Math.round(purchasePrice * unitsPerBox * 100) / 100;
        }
      }
      let boxSellingPrice = data.boxSellingPrice !== void 0 && data.boxSellingPrice !== null ? Number(data.boxSellingPrice) : null;
      let sellingPrice = data.sellingPrice !== void 0 && data.sellingPrice !== null ? Number(data.sellingPrice) : null;
      if (isBottle) {
        if (sellingPrice === null && boxSellingPrice !== null) sellingPrice = boxSellingPrice;
        if (boxSellingPrice === null && sellingPrice !== null) boxSellingPrice = sellingPrice;
      } else {
        if (boxSellingPrice !== null && sellingPrice === null) {
          sellingPrice = unitsPerBox > 0 ? Math.round(boxSellingPrice / unitsPerBox * 100) / 100 : 0;
        } else if (sellingPrice !== null && boxSellingPrice === null) {
          boxSellingPrice = Math.round(sellingPrice * unitsPerBox * 100) / 100;
        }
      }
      let existingInv = null;
      if (data.batchNumber) {
        existingInv = await tx.inventory.findFirst({
          where: {
            branchId: data.branchId,
            productId: data.productId,
            batchNumber: data.batchNumber
          }
        });
      }
      let inventory;
      if (existingInv) {
        inventory = await tx.inventory.update({
          where: { id: existingInv.id },
          data: {
            quantity: { increment: data.quantity },
            cartonQuantity: isBoxReceiving ? void 0 : { increment: cartonsReceived },
            cartonsReceived: isBoxReceiving ? void 0 : { increment: cartonsReceived },
            looseBoxesReceived: isBoxReceiving ? { increment: looseBoxesReceived } : void 0,
            boxQuantity: { increment: boxesReceived },
            purchasePrice: purchasePrice !== null ? purchasePrice : existingInv.purchasePrice,
            sellingPrice: sellingPrice !== null ? sellingPrice : existingInv.sellingPrice,
            boxPurchasePrice: boxPurchasePrice !== null ? boxPurchasePrice : existingInv.boxPurchasePrice,
            boxSellingPrice: boxSellingPrice !== null ? boxSellingPrice : existingInv.boxSellingPrice,
            supplierId: data.supplierId || existingInv.supplierId,
            shelfLocation: data.shelfLocation || existingInv.shelfLocation,
            expiryDate: expiryDate || existingInv.expiryDate,
            receivedDate: data.receivedDate ? receivedDate : existingInv.receivedDate || receivedDate
          }
        });
      } else {
        inventory = await tx.inventory.create({
          data: {
            branchId: data.branchId,
            productId: data.productId,
            supplierId: data.supplierId || null,
            quantity: data.quantity,
            initialQuantity: data.quantity,
            batchNumber: data.batchNumber || null,
            barcode: data.barcode || product.barcode || null,
            mfgDate,
            expiryDate,
            receivedDate,
            packageType: packagingModel,
            cartonQuantity: isBoxReceiving ? 0 : cartonsReceived,
            cartonsReceived: isBoxReceiving ? 0 : cartonsReceived,
            looseBoxesReceived: isBoxReceiving ? looseBoxesReceived : 0,
            allocatedCartons: 0,
            allocatedLooseBoxes: 0,
            boxesPerCarton,
            boxQuantity: boxesReceived,
            stripsPerBox,
            tabletsPerStrip,
            purchasePrice,
            sellingPrice: sellingPrice !== null ? sellingPrice : product.basePrice,
            boxPurchasePrice,
            boxSellingPrice,
            shelfLocation: data.shelfLocation || product.shelfLocation || null,
            minStockLevel: product.minStockAlert || 10,
            lowStockThreshold: 5
          }
        });
      }
      await tx.batchReceivingRecord.create({
        data: {
          inventoryId: inventory.id,
          branchId: data.branchId,
          productId: data.productId,
          supplierId: data.supplierId || null,
          contactPersonId: data.contactPersonId || null,
          contactPersonName,
          batchNumber: data.batchNumber || null,
          receivingUnit: isBoxReceiving ? "BOX" : "CARTON",
          cartonsReceived: isBoxReceiving ? 0 : cartonsReceived,
          boxesPerCarton,
          boxesReceived,
          stripsPerBox,
          tabletsPerStrip,
          totalQuantity: data.quantity,
          purchasePrice,
          sellingPrice,
          boxPurchasePrice,
          boxSellingPrice,
          receivedDate,
          expiryDate,
          mfgDate,
          invoiceNo: data.invoiceNo || null,
          notes: data.notes || null,
          receivedBy: userId
        }
      });
      const movement = await tx.stockMovement.create({
        data: {
          branchId: data.branchId,
          productId: data.productId,
          inventoryId: inventory.id,
          batchNumber: data.batchNumber || null,
          type: "PURCHASE",
          quantity: data.quantity,
          unitPrice: purchasePrice || 0,
          reason: data.notes || "Stock Inward (Direct Batch Entry)",
          performedBy: userId
        }
      });
      const paid = Number(data.paidAmount || 0);
      let financialAccount = null;
      if (paid > 0) {
        if (!data.financialAccountId) {
          throw new Error("A valid financial account for the selected branch is required when paying a supplier.");
        }
        financialAccount = await tx.financialAccount.findFirst({
          where: {
            id: data.financialAccountId,
            tenantId,
            branchId: data.branchId,
            isActive: true
          }
        });
        if (!financialAccount) {
          throw new Error("Selected financial account does not exist or does not belong to this branch.");
        }
        await tx.financialAccount.update({
          where: { id: financialAccount.id },
          data: { balance: { decrement: paid } }
        });
        await tx.financialTransaction.create({
          data: {
            tenantId,
            branchId: data.branchId,
            sourceAccountId: financialAccount.id,
            amount: paid,
            type: "PURCHASE_PAYMENT",
            reference: `INWARD-${inventory.batchNumber || inventory.id.substring(0, 8)}`,
            note: data.notes || `Stock Inward supplier payment via ${financialAccount.name}`,
            userId
          }
        });
      }
      const effectiveUnitCost = purchasePrice || 0;
      const totalPurchaseValue = effectiveUnitCost * data.quantity;
      const due = Math.max(0, totalPurchaseValue - paid);
      const purchaseStatus = due === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "DUE";
      const invoiceNo = data.invoiceNo || `PUR-${inventory.batchNumber || Date.now().toString().slice(-6)}`;
      const purchaseRecord = await tx.purchase.create({
        data: {
          tenantId,
          branchId: data.branchId,
          supplierId: data.supplierId || null,
          contactPersonId: data.contactPersonId || null,
          contactPersonName,
          invoiceNo,
          purchaseDate: receivedDate,
          totalAmount: totalPurchaseValue,
          paidAmount: paid,
          dueAmount: due,
          paymentStatus: purchaseStatus,
          paymentMethod: paid > 0 && financialAccount ? financialAccount.type || "CASH" : "CASH",
          notes: data.notes || `Stock Inward Batch ${inventory.batchNumber || ""}`,
          receivedBy: userId,
          items: {
            create: [
              {
                productId: data.productId,
                inventoryId: inventory.id,
                batchNumber: data.batchNumber || null,
                barcode: data.barcode || product.barcode || null,
                mfgDate,
                expiryDate,
                packageType: data.packageType || product.category || "Medicine",
                cartonQuantity: isBoxReceiving ? 0 : cartonsReceived,
                boxQuantity: boxesReceived,
                stripsPerBox,
                tabletsPerStrip,
                quantity: data.quantity,
                unitPurchasePrice: effectiveUnitCost,
                unitSellingPrice: sellingPrice || 0,
                totalAmount: totalPurchaseValue,
                shelfLocation: data.shelfLocation || null
              }
            ]
          }
        }
      });
      if (data.supplierId && supplier) {
        await tx.supplier.update({
          where: { id: data.supplierId },
          data: {
            totalPurchased: { increment: totalPurchaseValue },
            totalPaid: { increment: paid },
            totalDue: { increment: due }
          }
        });
        if (paid > 0) {
          await tx.supplierPayment.create({
            data: {
              tenantId,
              supplierId: data.supplierId,
              branchId: data.branchId,
              purchaseId: purchaseRecord.id,
              financialAccountId: financialAccount ? financialAccount.id : null,
              amount: paid,
              previousDue: Number(supplier.totalDue || 0),
              remainingDue: Math.max(0, Number(supplier.totalDue || 0) + due),
              paymentMethod: financialAccount ? financialAccount.type : "CASH",
              reference: invoiceNo,
              notes: `Paid at stock intake for invoice #${invoiceNo}`,
              paidBy: userId,
              paymentDate: receivedDate
            }
          });
        }
      }
      return { inventory, movement, purchase: purchaseRecord };
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "STOCK_INWARD",
      details: {
        productId: data.productId,
        productName: product.name,
        quantity: data.quantity,
        batchNumber: data.batchNumber
      }
    });
    return result;
  }
  /**
   * Adjust Stock (Manual correction, Damage, Adjustment, Return)
   */
  static async adjustStock(tenantId, userId, data) {
    const [branch, product] = await Promise.all([
      prisma.branch.findFirst({ where: { id: data.branchId, tenantId } }),
      prisma.product.findFirst({ where: { id: data.productId, tenantId } })
    ]);
    if (!branch) throw new Error("Branch not found in your company");
    if (!product) throw new Error("Product not found in your catalog");
    const result = await prisma.$transaction(async (tx) => {
      let inventory = null;
      if (data.inventoryId) {
        inventory = await tx.inventory.findUnique({ where: { id: data.inventoryId } });
      } else if (data.batchNumber) {
        inventory = await tx.inventory.findFirst({
          where: { branchId: data.branchId, productId: data.productId, batchNumber: data.batchNumber }
        });
      } else {
        inventory = await tx.inventory.findFirst({
          where: { branchId: data.branchId, productId: data.productId }
        });
      }
      let newQuantity = data.quantity;
      if (inventory) {
        newQuantity = inventory.quantity + data.quantity;
        if (newQuantity < 0) {
          throw new Error(`Cannot reduce stock below 0. Current batch stock is ${inventory.quantity}`);
        }
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            ...data.expiryDate && { expiryDate: new Date(data.expiryDate) },
            ...data.minStockLevel !== void 0 && { minStockLevel: data.minStockLevel },
            ...data.lowStockThreshold !== void 0 && { lowStockThreshold: data.lowStockThreshold }
          }
        });
      } else {
        if (data.quantity < 0) throw new Error("Cannot create inventory with negative stock");
        inventory = await tx.inventory.create({
          data: {
            branchId: data.branchId,
            productId: data.productId,
            quantity: data.quantity,
            initialQuantity: data.quantity,
            batchNumber: data.batchNumber || null,
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
            receivedDate: /* @__PURE__ */ new Date(),
            minStockLevel: data.minStockLevel || product.minStockAlert || 10,
            lowStockThreshold: data.lowStockThreshold || 5
          }
        });
      }
      const movement = await tx.stockMovement.create({
        data: {
          branchId: data.branchId,
          productId: data.productId,
          inventoryId: inventory.id,
          batchNumber: inventory.batchNumber,
          type: data.type || "ADJUSTMENT",
          quantity: data.quantity,
          reason: data.reason || "Manual Stock Adjustment",
          performedBy: userId
        }
      });
      return { inventory, movement };
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "STOCK_ADJUSTMENT",
      details: {
        productId: data.productId,
        quantityChange: data.quantity,
        type: data.type,
        reason: data.reason
      }
    });
    return result;
  }
  /**
   * Update Inventory Item metadata
   */
  static async updateInventoryItem(inventoryId, tenantId, userId, data) {
    const item = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { branch: true, product: true }
    });
    if (!item || item.branch.tenantId !== tenantId) {
      throw new Error("Inventory item not found");
    }
    const updated = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        ...data.quantity !== void 0 && { quantity: data.quantity },
        ...data.batchNumber !== void 0 && { batchNumber: data.batchNumber },
        ...data.barcode !== void 0 && { barcode: data.barcode },
        ...data.expiryDate && { expiryDate: new Date(data.expiryDate) },
        ...data.shelfLocation !== void 0 && { shelfLocation: data.shelfLocation },
        ...data.purchasePrice !== void 0 && { purchasePrice: data.purchasePrice },
        ...data.sellingPrice !== void 0 && { sellingPrice: data.sellingPrice },
        ...data.minStockLevel !== void 0 && { minStockLevel: data.minStockLevel },
        ...data.lowStockThreshold !== void 0 && { lowStockThreshold: data.lowStockThreshold }
      }
    });
    await AuditService.log({
      tenantId,
      branchId: item.branchId,
      userId,
      action: "INVENTORY_ITEM_UPDATE",
      details: { inventoryId, changes: data }
    });
    return updated;
  }
  /**
   * Allocate Stock from Bulk to Physical Location
   */
  static async allocateStock(tenantId, userId, data) {
    const inventory = await prisma.inventory.findFirst({
      where: { id: data.inventoryId, branch: { tenantId } },
      include: {
        locations: {
          include: { rack: true, shelf: true, bin: true }
        }
      }
    });
    if (!inventory) throw new Error("Inventory/Batch not found");
    const totalAllocated = (inventory.locations || []).reduce(
      (sum, loc) => sum + loc.quantity,
      0
    );
    const unallocatedBulk = inventory.quantity - totalAllocated;
    if (data.quantity > unallocatedBulk) {
      throw new Error(
        `Cannot allocate more than bulk quantity. Available bulk: ${unallocatedBulk}`
      );
    }
    let rackId = data.rackId || null;
    let shelfId = data.shelfId || null;
    let binId = data.binId || null;
    if (binId && (!shelfId || !rackId)) {
      const b = await prisma.bin.findUnique({
        where: { id: binId },
        include: { shelf: true }
      });
      if (b) {
        shelfId = shelfId || b.shelfId;
        rackId = rackId || b.shelf?.rackId;
      }
    }
    if (shelfId && !rackId) {
      const s = await prisma.shelf.findUnique({
        where: { id: shelfId }
      });
      if (s) {
        rackId = rackId || s.rackId;
      }
    }
    if (data.rack && !rackId) {
      const trimmed = data.rack.trim();
      let rack = await prisma.rack.findFirst({
        where: { branchId: inventory.branchId, name: trimmed }
      });
      if (!rack) {
        rack = await prisma.rack.create({
          data: { branchId: inventory.branchId, name: trimmed }
        });
      }
      rackId = rack.id;
    }
    if (data.shelf && !shelfId && rackId) {
      const trimmed = data.shelf.trim();
      let shelf = await prisma.shelf.findFirst({
        where: { rackId, name: trimmed }
      });
      if (!shelf) {
        shelf = await prisma.shelf.create({
          data: { rackId, name: trimmed }
        });
      }
      shelfId = shelf.id;
    }
    if (data.bin && !binId && shelfId) {
      const trimmed = data.bin.trim();
      let bin = await prisma.bin.findFirst({
        where: { shelfId, name: trimmed }
      });
      if (!bin) {
        bin = await prisma.bin.create({
          data: { shelfId, name: trimmed }
        });
      }
      binId = bin.id;
    }
    const result = await prisma.$transaction(async (tx) => {
      let location = await tx.inventoryLocation.findFirst({
        where: {
          inventoryId: inventory.id,
          rackId,
          shelfId,
          binId
        }
      });
      if (location) {
        location = await tx.inventoryLocation.update({
          where: { id: location.id },
          data: { quantity: { increment: data.quantity } }
        });
      } else {
        location = await tx.inventoryLocation.create({
          data: {
            inventoryId: inventory.id,
            rackId,
            shelfId,
            binId,
            quantity: data.quantity
          }
        });
      }
      const stripsPerBox = inventory.stripsPerBox || 10;
      const tabletsPerStrip = inventory.tabletsPerStrip || 10;
      const tabletsPerBox = Math.max(1, stripsPerBox * tabletsPerStrip);
      const boxesPerCarton = inventory.boxesPerCarton || 10;
      const totalLoose = Number(inventory.looseBoxesReceived) || 0;
      const currAllocatedLoose = Number(inventory.allocatedLooseBoxes) || 0;
      const remainingLoose = Math.max(0, totalLoose - currAllocatedLoose);
      const cartonsReceived = Number(inventory.cartonsReceived) || Number(inventory.cartonQuantity) || 0;
      const totalCartonBoxes = cartonsReceived * boxesPerCarton;
      const currBoxesFromCarton = Number(inventory.boxesAllocatedFromCarton) || (Number(inventory.allocatedCartons) || 0) * boxesPerCarton;
      const remainingCartonBoxes = Math.max(0, totalCartonBoxes - currBoxesFromCarton);
      const boxesToAllocate = data.boxesAllocated ?? Math.ceil(data.quantity / tabletsPerBox);
      let looseToAllocate = 0;
      let cartonBoxesToAllocate = 0;
      let defaultReason = "Stock Placed in Rack";
      let movementReferenceId = "ALLOCATION";
      if (data.allocationSource === "FROM_CARTON" || data.allocationSource === "CARTON") {
        cartonBoxesToAllocate = boxesToAllocate;
        looseToAllocate = 0;
        if (cartonBoxesToAllocate > remainingCartonBoxes && totalCartonBoxes > 0) {
          throw new Error(
            `Cannot allocate ${cartonBoxesToAllocate} boxes from carton. Only ${remainingCartonBoxes} boxes available in cartons.`
          );
        }
        movementReferenceId = "FROM_CARTON";
        defaultReason = `Stock Placed in Rack (From Carton): ${cartonBoxesToAllocate} Box${cartonBoxesToAllocate > 1 ? "es" : ""} (${data.quantity} units)`;
      } else if (data.allocationSource === "LOOSE_BOX") {
        looseToAllocate = boxesToAllocate;
        cartonBoxesToAllocate = 0;
        if (looseToAllocate > remainingLoose && totalLoose > 0) {
          throw new Error(
            `Cannot allocate ${looseToAllocate} loose boxes. Only ${remainingLoose} loose boxes available.`
          );
        }
        movementReferenceId = "LOOSE_BOX";
        defaultReason = `Stock Placed in Rack (Loose Box): ${looseToAllocate} Loose Box${looseToAllocate > 1 ? "es" : ""} (${data.quantity} units)`;
      } else if (data.allocationSource === "LOOSE_STRIP") {
        looseToAllocate = 0;
        cartonBoxesToAllocate = 0;
        movementReferenceId = "LOOSE_STRIP";
        defaultReason = `Stock Placed in Rack (Loose Strip): ${data.stripsAllocated || Math.ceil(data.quantity / tabletsPerStrip)} Loose Strip(s) (${data.quantity} units)`;
      } else if (data.allocationSource === "LOOSE_TABLET") {
        looseToAllocate = 0;
        cartonBoxesToAllocate = 0;
        movementReferenceId = "LOOSE_TABLET";
        defaultReason = `Stock Placed in Rack (Loose Tablet): ${data.quantity} Loose Tablet(s)`;
      } else {
        if (remainingLoose >= boxesToAllocate) {
          looseToAllocate = boxesToAllocate;
          movementReferenceId = "LOOSE_BOX";
          defaultReason = `Stock Placed in Rack (Loose Box): ${looseToAllocate} Loose Box${looseToAllocate > 1 ? "es" : ""} (${data.quantity} units)`;
        } else {
          looseToAllocate = remainingLoose;
          const remainingNeeded = boxesToAllocate - looseToAllocate;
          cartonBoxesToAllocate = remainingNeeded;
          movementReferenceId = "FROM_CARTON";
          defaultReason = `Stock Placed in Rack: ${cartonBoxesToAllocate} Box(es) from carton, ${looseToAllocate} loose box(es) (${data.quantity} units)`;
        }
      }
      if (looseToAllocate > 0 || cartonBoxesToAllocate > 0) {
        const newTotalBoxesFromCarton = currBoxesFromCarton + cartonBoxesToAllocate;
        const newCartonsOpened = Math.ceil(newTotalBoxesFromCarton / boxesPerCarton);
        const newRemainingCartons = Math.max(0, cartonsReceived - newCartonsOpened);
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            allocatedLooseBoxes: looseToAllocate > 0 ? { increment: looseToAllocate } : void 0,
            boxesAllocatedFromCarton: cartonBoxesToAllocate > 0 ? { increment: cartonBoxesToAllocate } : void 0,
            allocatedCartons: cartonBoxesToAllocate > 0 ? newCartonsOpened : void 0,
            cartonQuantity: cartonBoxesToAllocate > 0 ? newRemainingCartons : void 0
          }
        });
      }
      const movement = await tx.stockMovement.create({
        data: {
          branchId: inventory.branchId,
          productId: inventory.productId,
          inventoryId: inventory.id,
          batchNumber: inventory.batchNumber,
          type: "ALLOCATION",
          quantity: data.quantity,
          referenceId: movementReferenceId,
          toLocationId: location.id,
          reason: data.notes || defaultReason,
          performedBy: userId
        }
      });
      return { location, movement };
    });
    return result;
  }
  /**
   * Get single batch stock details with full receiving records and locations
   */
  static async getBatchDetails(tenantId, inventoryId) {
    const inv = await prisma.inventory.findFirst({
      where: { id: inventoryId, branch: { tenantId } },
      include: {
        product: {
          include: {
            categoryRef: true,
            brandRef: true,
            unitRef: true
          }
        },
        supplier: {
          select: { id: true, name: true, phone: true, email: true }
        },
        locations: {
          include: {
            rack: true,
            shelf: true,
            bin: true
          }
        },
        receivingRecords: {
          orderBy: { receivedDate: "desc" },
          include: {
            supplier: {
              select: { id: true, name: true, phone: true }
            }
          }
        }
      }
    });
    if (!inv) throw new Error("Batch not found");
    const metrics = _InventoryService.calculateBatchPackagingMetrics(inv);
    const {
      stripsPerBox,
      tabletsPerStrip,
      tabletsPerBox,
      boxesPerCarton,
      fullCartons,
      boxesInsideCartons,
      remainingLooseBoxes,
      totalEquivalentBoxes,
      totalStrips,
      totalTablets,
      unboxedStrips,
      unboxedTablets,
      formulaText,
      totalAllocated,
      unallocatedBulk
    } = metrics;
    const formattedLocations = (inv.locations || []).map((loc) => {
      const rackName = loc.rack?.name || "\u2014";
      const shelfName = loc.shelf?.name || "\u2014";
      const binName = loc.bin?.name || "\u2014";
      const qty = loc.quantity || 0;
      const fullBoxes = Math.floor(qty / tabletsPerBox);
      const looseTablets = qty % tabletsPerBox;
      const openBoxes = looseTablets > 0 ? 1 : 0;
      const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
      const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
      const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
      const locationLabel = parts.length > 0 ? parts.join(" \u2192 ") : "General Shelf";
      const stockParts = [];
      if (fullBoxes > 0) stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
      if (openBoxRemainingStrips > 0)
        stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
      if (openBoxRemainingTablets > 0)
        stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
      if (stockParts.length === 0) stockParts.push(`${qty} ${inv.product.unit || "units"}`);
      const displayText = stockParts.join(", ");
      return {
        ...loc,
        rackName,
        shelfName,
        binName,
        locationLabel,
        fullBoxes,
        looseTablets,
        openBoxes,
        strips: openBoxRemainingStrips,
        tablets: openBoxRemainingTablets,
        openBoxRemainingStrips,
        openBoxRemainingTablets,
        displayText,
        stripsPerBox,
        tabletsPerStrip,
        tabletsPerBox,
        unit: inv.product.unit || "tablet"
      };
    });
    return {
      ...inv,
      ...metrics,
      cartonQuantity: fullCartons,
      boxQuantity: totalEquivalentBoxes,
      locations: formattedLocations,
      receivingRecords: inv.receivingRecords || []
    };
  }
  /**
   * Move Stock from one Location to another Location or back to Bulk
   */
  static async moveStock(tenantId, userId, data) {
    const fromLocation = await prisma.inventoryLocation.findFirst({
      where: { id: data.fromLocationId, inventory: { branch: { tenantId } } },
      include: { inventory: true }
    });
    if (!fromLocation) throw new Error("Source location not found");
    if (data.quantity > fromLocation.quantity) {
      throw new Error(
        `Cannot move more than location quantity. Available: ${fromLocation.quantity}`
      );
    }
    let rackId = data.rackId || null;
    let shelfId = data.shelfId || null;
    let binId = data.binId || null;
    if (binId && (!shelfId || !rackId)) {
      const b = await prisma.bin.findUnique({
        where: { id: binId },
        include: { shelf: true }
      });
      if (b) {
        shelfId = shelfId || b.shelfId;
        rackId = rackId || b.shelf?.rackId;
      }
    }
    if (shelfId && !rackId) {
      const s = await prisma.shelf.findUnique({
        where: { id: shelfId }
      });
      if (s) {
        rackId = rackId || s.rackId;
      }
    }
    if (data.rack && !rackId) {
      const trimmed = data.rack.trim();
      let rack = await prisma.rack.findFirst({
        where: { branchId: fromLocation.inventory.branchId, name: trimmed }
      });
      if (!rack) {
        rack = await prisma.rack.create({
          data: { branchId: fromLocation.inventory.branchId, name: trimmed }
        });
      }
      rackId = rack.id;
    }
    if (data.shelf && !shelfId && rackId) {
      const trimmed = data.shelf.trim();
      let shelf = await prisma.shelf.findFirst({
        where: { rackId, name: trimmed }
      });
      if (!shelf) {
        shelf = await prisma.shelf.create({
          data: { rackId, name: trimmed }
        });
      }
      shelfId = shelf.id;
    }
    if (data.bin && !binId && shelfId) {
      const trimmed = data.bin.trim();
      let bin = await prisma.bin.findFirst({
        where: { shelfId, name: trimmed }
      });
      if (!bin) {
        bin = await prisma.bin.create({
          data: { shelfId, name: trimmed }
        });
      }
      binId = bin.id;
    }
    const result = await prisma.$transaction(async (tx) => {
      const updatedFromLocation = await tx.inventoryLocation.update({
        where: { id: fromLocation.id },
        data: { quantity: { decrement: data.quantity } }
      });
      let toLocation = await tx.inventoryLocation.findFirst({
        where: {
          inventoryId: fromLocation.inventoryId,
          rackId,
          shelfId,
          binId
        }
      });
      if (toLocation) {
        toLocation = await tx.inventoryLocation.update({
          where: { id: toLocation.id },
          data: { quantity: { increment: data.quantity } }
        });
      } else {
        toLocation = await tx.inventoryLocation.create({
          data: {
            inventoryId: fromLocation.inventoryId,
            rackId,
            shelfId,
            binId,
            quantity: data.quantity
          }
        });
      }
      const movement = await tx.stockMovement.create({
        data: {
          branchId: fromLocation.inventory.branchId,
          productId: fromLocation.inventory.productId,
          inventoryId: fromLocation.inventoryId,
          batchNumber: fromLocation.inventory.batchNumber,
          type: "LOCATION_TRANSFER",
          quantity: data.quantity,
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          reason: data.notes || "Location Transfer",
          performedBy: userId
        }
      });
      return { fromLocation: updatedFromLocation, toLocation, movement };
    });
    return result;
  }
  /**
   * Remove Expired Stock with Source Isolation (Bulk Carton vs Rack/Shelf/Bin)
   */
  static async removeExpiredStock(tenantId, userId, data) {
    const inventory = await prisma.inventory.findFirst({
      where: { id: data.inventoryId, branchId: data.branchId, branch: { tenantId } },
      include: {
        locations: { include: { rack: true, shelf: true, bin: true } },
        product: true
      }
    });
    if (!inventory) throw new Error("Inventory batch record not found in this branch");
    const totalAllocated = (inventory.locations || []).reduce(
      (sum, loc) => sum + loc.quantity,
      0
    );
    const unallocatedBulk = inventory.quantity - totalAllocated;
    let targetLocation = null;
    if (data.source === "BULK") {
      if (data.quantity > unallocatedBulk) {
        throw new Error(
          `Cannot remove more than available bulk stock. Available bulk: ${unallocatedBulk} units`
        );
      }
    } else {
      if (!data.locationId) {
        throw new Error("Physical Location ID is required when removing physical shelf stock");
      }
      targetLocation = (inventory.locations || []).find((l) => l.id === data.locationId);
      if (!targetLocation) {
        throw new Error("Specified physical location does not exist for this batch");
      }
      if (data.quantity > targetLocation.quantity) {
        throw new Error(
          `Cannot remove more than location quantity. Available at location: ${targetLocation.quantity} units`
        );
      }
    }
    const result = await prisma.$transaction(async (tx) => {
      if (data.source === "LOCATION" && targetLocation) {
        await tx.inventoryLocation.update({
          where: { id: targetLocation.id },
          data: { quantity: { decrement: data.quantity } }
        });
      }
      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: data.quantity } }
      });
      const locationLabel = data.source === "LOCATION" && targetLocation ? `Rack: ${targetLocation.rack?.name || targetLocation.rack || "-"} / Shelf: ${targetLocation.shelf?.name || targetLocation.shelf || "-"} / Bin: ${targetLocation.bin?.name || targetLocation.bin || "-"}` : "Bulk / Carton Storage";
      const movement = await tx.stockMovement.create({
        data: {
          branchId: inventory.branchId,
          productId: inventory.productId,
          inventoryId: inventory.id,
          batchNumber: inventory.batchNumber,
          type: "DAMAGE",
          quantity: -data.quantity,
          fromLocationId: data.source === "LOCATION" ? targetLocation?.id : null,
          unitPrice: inventory.purchasePrice || 0,
          reason: `[EXPIRED REMOVAL] ${data.reason || "Expired stock removed from pharmacy"} (${locationLabel})`,
          performedBy: userId
        }
      });
      return { inventory: updatedInventory, movement };
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "EXPIRED_STOCK_REMOVAL",
      details: {
        inventoryId: inventory.id,
        productId: inventory.productId,
        productName: inventory.product?.name,
        batchNumber: inventory.batchNumber,
        source: data.source,
        quantityRemoved: data.quantity,
        reason: data.reason
      }
    });
    return result;
  }
  /**
   * Stock Movement / History Ledger with Date Range & Filters
   */
  static async listMovements(tenantId, query, userRole, userBranchId) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;
    const where = {};
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    } else {
      const tenantBranches = await prisma.branch.findMany({
        where: { tenantId },
        select: { id: true }
      });
      where.branchId = { in: tenantBranches.map((b) => b.id) };
    }
    if (query.productId) {
      where.productId = query.productId;
    }
    if (query.inventoryId) {
      where.inventoryId = query.inventoryId;
    }
    if (query.locationId) {
      where.OR = [
        { fromLocationId: query.locationId },
        { toLocationId: query.locationId }
      ];
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (typeof query.search === "string" && query.search.trim() && !query.locationId) {
      where.OR = [
        { reason: { contains: query.search.trim(), mode: "insensitive" } },
        { batchNumber: { contains: query.search.trim(), mode: "insensitive" } }
      ];
    }
    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          inventory: {
            include: {
              product: {
                select: { id: true, name: true, genericName: true, unit: true, size: true, manufacturer: true }
              }
            }
          },
          fromLocation: {
            select: {
              id: true,
              rack: { select: { id: true, name: true } },
              shelf: { select: { id: true, name: true } },
              bin: { select: { id: true, name: true } }
            }
          },
          toLocation: {
            select: {
              id: true,
              rack: { select: { id: true, name: true } },
              shelf: { select: { id: true, name: true } },
              bin: { select: { id: true, name: true } }
            }
          }
        }
      })
    ]);
    const missingProductIds = movements.filter((m) => !m.inventory?.product && m.productId).map((m) => m.productId);
    let productMap = /* @__PURE__ */ new Map();
    if (missingProductIds.length > 0) {
      const prods = await prisma.product.findMany({
        where: { id: { in: missingProductIds } },
        select: { id: true, name: true, genericName: true, unit: true, size: true, manufacturer: true, stripsPerBox: true, tabletsPerStrip: true }
      });
      productMap = new Map(prods.map((p) => [p.id, p]));
    }
    const userIds = Array.from(
      new Set(movements.map((m) => m.performedBy).filter(Boolean))
    );
    let userMap = /* @__PURE__ */ new Map();
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, role: true }
      });
      userMap = new Map(users.map((u) => [u.id, u.name || u.role || "Staff"]));
    }
    const formattedMovements = movements.map((m) => {
      const prod = m.inventory?.product || productMap.get(m.productId) || {
        name: "Unknown Product",
        genericName: null,
        unit: "unit"
      };
      const formatLoc = (loc) => {
        if (!loc) return null;
        const rackName = loc.rack?.name || "-";
        const shelfName = loc.shelf?.name || "-";
        const binName = loc.bin?.name || "-";
        return `${rackName} \u2192 ${shelfName} \u2192 ${binName}`;
      };
      const fromLabel = formatLoc(m.fromLocation) || (m.type === "ALLOCATION" ? "Stock Not in Rack" : m.type === "PURCHASE" ? "Supplier Intake" : "Stock Not in Rack");
      const toLabel = formatLoc(m.toLocation) || (m.type === "SALE" ? "Customer POS Sale" : m.type === "DAMAGE" ? "Damaged/Expired Removal" : m.type === "PURCHASE" ? "Stock Not in Rack" : "\u2014");
      let sourceDestination = "";
      if (m.type === "ALLOCATION") {
        sourceDestination = `Stock Not in Rack \u2192 ${formatLoc(m.toLocation) || "Rack / Shelf / Bin"}`;
      } else if (m.type === "LOCATION_TRANSFER") {
        sourceDestination = `${formatLoc(m.fromLocation) || "Shelf"} \u2192 ${formatLoc(m.toLocation) || "Shelf"}`;
      } else if (m.type === "PURCHASE") {
        sourceDestination = `Supplier Intake \u2192 Stock Not in Rack`;
      } else if (m.type === "SALE") {
        sourceDestination = m.fromLocation ? `${formatLoc(m.fromLocation)} \u2192 Customer POS Sale` : "Stock Not in Rack \u2192 Customer POS Sale";
      } else if (m.type === "DAMAGE") {
        sourceDestination = m.fromLocation ? `${formatLoc(m.fromLocation)} \u2192 Expired/Damaged Removal` : "Stock Not in Rack \u2192 Expired/Damaged Removal";
      } else {
        sourceDestination = `${fromLabel} \u2192 ${toLabel}`;
      }
      let actionLabel = "Stock Movement";
      switch (m.type) {
        case "PURCHASE":
          actionLabel = "Stock Received";
          break;
        case "ALLOCATION":
          actionLabel = "Stock Placed in Rack";
          break;
        case "LOCATION_TRANSFER":
          actionLabel = "Stock Moved";
          break;
        case "SALE":
          actionLabel = "POS Sale";
          break;
        case "DAMAGE":
          actionLabel = "Damaged";
          break;
        case "RETURN":
          actionLabel = "Stock Returned";
          break;
        case "ADJUSTMENT":
          actionLabel = "Stock Adjustment";
          break;
        case "TRANSFER_OUT":
          actionLabel = "Transfer Out";
          break;
        case "TRANSFER_IN":
          actionLabel = "Transfer Received";
          break;
      }
      const stripsPerBox = m.inventory?.stripsPerBox || prod?.stripsPerBox || 10;
      const tabletsPerStrip = m.inventory?.tabletsPerStrip || prod?.tabletsPerStrip || 10;
      const tabletsPerBox = stripsPerBox * tabletsPerStrip;
      const boxesPerCarton = m.inventory?.boxesPerCarton || 10;
      const tabletsPerCarton = boxesPerCarton * tabletsPerBox;
      const absQty = Math.abs(m.quantity || 0);
      let packagingUnit = "Tablets";
      let packagingDisplay = "";
      if (absQty >= tabletsPerCarton && absQty % tabletsPerCarton === 0) {
        const c = absQty / tabletsPerCarton;
        packagingUnit = "Carton";
        packagingDisplay = `${c} Carton${c > 1 ? "s" : ""}`;
      } else if (absQty >= tabletsPerBox && absQty % tabletsPerBox === 0) {
        const b = absQty / tabletsPerBox;
        packagingUnit = "Box";
        packagingDisplay = `${b} Box${b > 1 ? "es" : ""}`;
      } else if (absQty >= tabletsPerStrip && absQty % tabletsPerStrip === 0) {
        const s = absQty / tabletsPerStrip;
        packagingUnit = "Strip";
        packagingDisplay = `${s} Strip${s > 1 ? "s" : ""}`;
      } else {
        packagingUnit = prod.unit || "Tablet";
        packagingDisplay = `${absQty} ${prod.unit || "unit"}${absQty !== 1 ? "s" : ""}`;
      }
      let sourceType = "\u2014";
      if (m.type === "ALLOCATION") {
        if (m.referenceId === "FROM_CARTON" || m.reason && m.reason.includes("From Carton")) {
          sourceType = "From Carton";
        } else if (m.referenceId === "LOOSE_BOX" || m.reason && m.reason.includes("Loose Box")) {
          sourceType = "Loose Box";
        } else if (m.referenceId === "LOOSE_STRIP" || m.reason && m.reason.includes("Loose Strip")) {
          sourceType = "Loose Strip";
        } else if (m.referenceId === "LOOSE_TABLET" || m.reason && m.reason.includes("Loose Tablet")) {
          sourceType = "Loose Tablet";
        }
      }
      const performedByName = userMap.get(m.performedBy) || "Staff";
      return {
        ...m,
        product: prod,
        sourceDestination,
        fromLocationLabel: fromLabel,
        toLocationLabel: toLabel,
        performedByName,
        actionLabel,
        packagingUnit,
        packagingDisplay,
        sourceType
      };
    });
    return {
      data: formattedMovements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Dedicated Stock Receiving History Query
   * Pulls real inward receiving records (BatchReceivingRecord & StockMovement of type PURCHASE)
   */
  static async listReceivingHistory(tenantId, query, userRole, userBranchId) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const branchWhere = {};
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      branchWhere.branchId = userBranchId;
    } else if (query.branchId && query.branchId !== "all") {
      branchWhere.branchId = query.branchId;
    } else {
      const tenantBranches = await prisma.branch.findMany({
        where: { tenantId },
        select: { id: true }
      });
      branchWhere.branchId = { in: tenantBranches.map((b) => b.id) };
    }
    const dateFilter = {};
    if (query.startDate || query.endDate) {
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }
    const recWhere = { ...branchWhere };
    if (Object.keys(dateFilter).length > 0) {
      recWhere.receivedDate = dateFilter;
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      recWhere.OR = [
        { batchNumber: { contains: q, mode: "insensitive" } },
        { invoiceNo: { contains: q, mode: "insensitive" } },
        { supplier: { name: { contains: q, mode: "insensitive" } } },
        { inventory: { product: { name: { contains: q, mode: "insensitive" } } } }
      ];
    }
    const batchCount = await prisma.batchReceivingRecord.count({ where: recWhere });
    if (batchCount > 0) {
      const records = await prisma.batchReceivingRecord.findMany({
        where: recWhere,
        skip,
        take: limit,
        orderBy: { receivedDate: "desc" },
        include: {
          supplier: { select: { id: true, name: true } },
          inventory: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  genericName: true,
                  unit: true,
                  category: true,
                  stripsPerBox: true,
                  tabletsPerStrip: true,
                  qtyPerLevel2: true
                }
              },
              supplier: { select: { id: true, name: true } }
            }
          }
        }
      });
      const missingProductIds = records.filter((r) => !r.inventory?.product && r.productId).map((r) => r.productId);
      let productMap = /* @__PURE__ */ new Map();
      if (missingProductIds.length > 0) {
        const prods = await prisma.product.findMany({
          where: { id: { in: missingProductIds } },
          select: { id: true, name: true, genericName: true, unit: true, stripsPerBox: true, tabletsPerStrip: true }
        });
        productMap = new Map(prods.map((p) => [p.id, p]));
      }
      const formatted = records.map((rec) => {
        const prod = rec.inventory?.product || productMap.get(rec.productId) || {
          name: "Unknown Product",
          genericName: null,
          unit: "Unit"
        };
        const supplierName = rec.supplier?.name || rec.inventory?.supplier?.name || rec.contactPersonName || "Direct Intake";
        const cartonsReceived = rec.cartonsReceived || 0;
        const boxesReceived = rec.boxesReceived || 0;
        const totalQuantity = rec.totalQuantity || 0;
        const stripsPerBox = rec.stripsPerBox || prod.stripsPerBox || 10;
        const tabletsPerStrip = rec.tabletsPerStrip || prod.tabletsPerStrip || 10;
        const tabletsPerBox = stripsPerBox * tabletsPerStrip;
        const boxesPerCarton = rec.boxesPerCarton || 10;
        let receivingUnit = rec.receivingUnit || "CARTON";
        let receivedQuantityLabel = "";
        let receivingUnitDisplay = "";
        let totalEquivalentLabel = "";
        if (receivingUnit === "CARTON" && cartonsReceived > 0) {
          receivingUnitDisplay = "Carton";
          receivedQuantityLabel = `${cartonsReceived} Carton${cartonsReceived > 1 ? "s" : ""}`;
          const calcBoxes = boxesReceived > 0 ? boxesReceived : cartonsReceived * boxesPerCarton;
          totalEquivalentLabel = `${calcBoxes} Boxes (${totalQuantity.toLocaleString()} ${prod.unit || "Units"})`;
        } else if (receivingUnit === "BOX" && boxesReceived > 0) {
          receivingUnitDisplay = "Box";
          receivedQuantityLabel = `${boxesReceived} Box${boxesReceived > 1 ? "es" : ""}`;
          totalEquivalentLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
        } else {
          receivingUnitDisplay = prod.unit || "Unit";
          receivedQuantityLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
          totalEquivalentLabel = boxesReceived > 0 ? `${boxesReceived} Boxes` : `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
        }
        const unitPurchasePrice = rec.purchasePrice ? Number(rec.purchasePrice) : 0;
        const boxPurchasePrice = rec.boxPurchasePrice ? Number(rec.boxPurchasePrice) : 0;
        let totalPurchaseValue = 0;
        if (boxPurchasePrice > 0 && boxesReceived > 0) {
          totalPurchaseValue = boxesReceived * boxPurchasePrice;
        } else if (unitPurchasePrice > 0 && totalQuantity > 0) {
          totalPurchaseValue = totalQuantity * unitPurchasePrice;
        }
        return {
          id: rec.id,
          receivedDate: rec.receivedDate || rec.createdAt,
          product: {
            id: prod.id,
            name: prod.name,
            genericName: prod.genericName,
            unit: prod.unit || "Unit"
          },
          supplierName,
          batchNumber: rec.batchNumber || "No Batch",
          invoiceNo: rec.invoiceNo || null,
          receivedQuantity: cartonsReceived > 0 ? cartonsReceived : boxesReceived > 0 ? boxesReceived : totalQuantity,
          receivingUnit: receivingUnitDisplay,
          receivedQuantityLabel,
          totalEquivalentLabel,
          totalQuantityUnits: totalQuantity,
          unitPurchasePrice,
          boxPurchasePrice,
          totalPurchaseValue
        };
      });
      return {
        data: formatted,
        pagination: {
          page,
          limit,
          total: batchCount,
          totalPages: Math.ceil(batchCount / limit)
        }
      };
    }
    const movWhere = { ...branchWhere, type: "PURCHASE" };
    if (Object.keys(dateFilter).length > 0) {
      movWhere.createdAt = dateFilter;
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      movWhere.OR = [
        { batchNumber: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } }
      ];
    }
    const [movCount, movements] = await Promise.all([
      prisma.stockMovement.count({ where: movWhere }),
      prisma.stockMovement.findMany({
        where: movWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          inventory: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  genericName: true,
                  unit: true,
                  stripsPerBox: true,
                  tabletsPerStrip: true,
                  qtyPerLevel2: true
                }
              },
              supplier: { select: { id: true, name: true } }
            }
          }
        }
      })
    ]);
    const missingProdIds = movements.filter((m) => !m.inventory?.product && m.productId).map((m) => m.productId);
    let prodMap = /* @__PURE__ */ new Map();
    if (missingProdIds.length > 0) {
      const prods = await prisma.product.findMany({
        where: { id: { in: missingProdIds } },
        select: { id: true, name: true, genericName: true, unit: true, stripsPerBox: true, tabletsPerStrip: true }
      });
      prodMap = new Map(prods.map((p) => [p.id, p]));
    }
    const formattedMovs = movements.map((m) => {
      const prod = m.inventory?.product || prodMap.get(m.productId) || {
        name: "Product",
        genericName: null,
        unit: "Unit"
      };
      const supplierName = m.inventory?.supplier?.name || "Direct Intake";
      const totalQuantity = Math.abs(m.quantity || 0);
      const stripsPerBox = m.inventory?.stripsPerBox || prod.stripsPerBox || 10;
      const tabletsPerStrip = m.inventory?.tabletsPerStrip || prod.tabletsPerStrip || 10;
      const tabletsPerBox = stripsPerBox * tabletsPerStrip;
      const boxesPerCarton = m.inventory?.boxesPerCarton || 10;
      const tabletsPerCarton = boxesPerCarton * tabletsPerBox;
      let receivingUnitDisplay = "Unit";
      let receivedQuantityLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
      let totalEquivalentLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
      let receivedQuantity = totalQuantity;
      if (totalQuantity >= tabletsPerCarton && totalQuantity % tabletsPerCarton === 0) {
        const cartons = totalQuantity / tabletsPerCarton;
        const boxes = cartons * boxesPerCarton;
        receivingUnitDisplay = "Carton";
        receivedQuantity = cartons;
        receivedQuantityLabel = `${cartons} Carton${cartons > 1 ? "s" : ""}`;
        totalEquivalentLabel = `${boxes} Boxes (${totalQuantity.toLocaleString()} ${prod.unit || "Units"})`;
      } else if (totalQuantity >= tabletsPerBox && totalQuantity % tabletsPerBox === 0) {
        const boxes = totalQuantity / tabletsPerBox;
        receivingUnitDisplay = "Box";
        receivedQuantity = boxes;
        receivedQuantityLabel = `${boxes} Box${boxes > 1 ? "es" : ""}`;
        totalEquivalentLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
      }
      const unitPurchasePrice = m.unitPrice ? Number(m.unitPrice) : m.inventory?.purchasePrice ? Number(m.inventory.purchasePrice) : 0;
      const totalPurchaseValue = totalQuantity * unitPurchasePrice;
      return {
        id: m.id,
        receivedDate: m.createdAt,
        product: {
          id: prod.id,
          name: prod.name,
          genericName: prod.genericName,
          unit: prod.unit || "Unit"
        },
        supplierName,
        batchNumber: m.batchNumber || "No Batch",
        invoiceNo: null,
        receivedQuantity,
        receivingUnit: receivingUnitDisplay,
        receivedQuantityLabel,
        totalEquivalentLabel,
        totalQuantityUnits: totalQuantity,
        unitPurchasePrice,
        boxPurchasePrice: null,
        totalPurchaseValue
      };
    });
    return {
      data: formattedMovs,
      pagination: {
        page,
        limit,
        total: movCount,
        totalPages: Math.ceil(movCount / limit)
      }
    };
  }
  /**
   * POS: Get FEFO-sorted batches with physical locations for a product
   */
  static async getPosAvailableBatches(tenantId, branchId, productId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, isActive: true }
    });
    if (!branch) throw new Error("Branch not found");
    const inventories = await prisma.inventory.findMany({
      where: {
        branchId,
        productId,
        quantity: { gt: 0 }
      },
      include: {
        product: true,
        locations: {
          where: { quantity: { gt: 0 } },
          include: {
            rack: { select: { id: true, name: true } },
            shelf: { select: { id: true, name: true } },
            bin: { select: { id: true, name: true } }
          }
        },
        receivingRecords: true
      },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }]
    });
    const now = /* @__PURE__ */ new Date();
    return inventories.filter((inv) => {
      const isExpired = inv.expiryDate ? new Date(inv.expiryDate) < now : false;
      return !isExpired;
    }).map((inv) => {
      const prod = inv.product;
      const metrics = _InventoryService.calculateBatchPackagingMetrics(inv);
      const {
        stripsPerBox,
        tabletsPerStrip,
        tabletsPerBox,
        boxesPerCarton,
        tabletsPerCarton,
        fullCartons,
        remainingLooseBoxes,
        totalEquivalentBoxes,
        unallocatedBulk,
        totalAllocated,
        unboxedStrips,
        unboxedTablets,
        isMedicine
      } = metrics;
      const physicalLocations = (inv.locations || []).map((loc) => {
        const rackName = loc.rack?.name || "\u2014";
        const shelfName = loc.shelf?.name || "\u2014";
        const binName = loc.bin?.name || "\u2014";
        const qty = loc.quantity || 0;
        const fullBoxes = Math.floor(qty / tabletsPerBox);
        const looseTablets = qty % tabletsPerBox;
        const openBoxes = looseTablets > 0 ? 1 : 0;
        const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
        const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
        const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
        const locationLabel = parts.length > 0 ? parts.join(" \u2192 ") : "General Shelf";
        const stockParts = [];
        if (fullBoxes > 0) stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
        if (openBoxRemainingStrips > 0)
          stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
        if (openBoxRemainingTablets > 0)
          stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
        if (stockParts.length === 0) stockParts.push(`${qty} ${prod.unit || "units"}`);
        const displayText = stockParts.join(", ");
        return {
          id: loc.id,
          inventoryId: loc.inventoryId,
          rackId: loc.rackId,
          shelfId: loc.shelfId,
          binId: loc.binId,
          quantity: qty,
          rack: loc.rack,
          shelf: loc.shelf,
          bin: loc.bin,
          rackName,
          shelfName,
          binName,
          locationLabel,
          fullBoxes,
          looseTablets,
          openBoxes,
          openBoxRemainingStrips,
          openBoxRemainingTablets,
          stripsPerBox,
          tabletsPerStrip,
          tabletsPerBox,
          unit: prod.unit || "tablet",
          displayText
        };
      });
      return {
        id: inv.id,
        batchNumber: inv.batchNumber || "\u2014",
        expiryDate: inv.expiryDate,
        purchasePrice: inv.purchasePrice,
        sellingPrice: inv.sellingPrice,
        quantity: inv.quantity,
        unallocatedBulk,
        totalAllocated,
        physicalLocations,
        hasPhysicalStock: physicalLocations.length > 0,
        packLevel1: prod.packLevel1,
        packLevel2: prod.packLevel2,
        packLevel3: prod.packLevel3,
        packLevel4: prod.packLevel4,
        qtyPerLevel2: prod.qtyPerLevel2,
        qtyPerLevel3: prod.qtyPerLevel3,
        qtyPerLevel4: prod.qtyPerLevel4,
        stripsPerBox,
        tabletsPerStrip,
        tabletsPerBox,
        tabletsPerCarton,
        fullCartons,
        remainingLooseBoxes,
        looseBoxes: remainingLooseBoxes,
        totalEquivalentBoxes,
        fullBulkBoxes: totalEquivalentBoxes,
        bulkOpenBoxRemainingStrips: unboxedStrips,
        bulkOpenBoxRemainingTablets: unboxedTablets,
        ...metrics,
        isMedicine,
        isExpired: inv.expiryDate ? new Date(inv.expiryDate) < now : false,
        daysUntilExpiry: inv.expiryDate ? Math.ceil((new Date(inv.expiryDate).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : null
      };
    });
  }
  /**
   * Low Stock Items Alert
   */
  static async getLowStockItems(tenantId, query, userRole, userBranchId) {
    const where = {
      product: { tenantId, isActive: true },
      branch: { tenantId, isActive: true }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        branch: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      },
      orderBy: { quantity: "asc" }
    });
    const lowStockItems = inventories.filter((inv) => inv.quantity <= (inv.lowStockThreshold || inv.minStockLevel || 5)).map((inv) => ({
      id: inv.id,
      branchId: inv.branchId,
      branchName: inv.branch.name,
      productId: inv.productId,
      productName: inv.product.name,
      sku: inv.product.sku,
      batchNumber: inv.batchNumber,
      unit: inv.product.unit,
      currentQuantity: inv.quantity,
      lowStockThreshold: inv.lowStockThreshold,
      minStockLevel: inv.minStockLevel,
      shelfLocation: inv.shelfLocation,
      supplierName: inv.supplier?.name || "\u2014"
    }));
    return {
      totalAlerts: lowStockItems.length,
      items: lowStockItems
    };
  }
  /**
   * Near Expiry / Expired Items Alert
   */
  static async getNearExpiryItems(tenantId, query, userRole, userBranchId) {
    const days = query.daysThreshold || 90;
    const thresholdDate = /* @__PURE__ */ new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);
    const where = {
      product: { tenantId, isActive: true },
      branch: { tenantId, isActive: true },
      expiryDate: { lte: thresholdDate, not: null },
      quantity: { gt: 0 }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        branch: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      },
      orderBy: { expiryDate: "asc" }
    });
    const now = /* @__PURE__ */ new Date();
    const formatted = inventories.map((inv) => {
      const expDate = new Date(inv.expiryDate);
      const isExpired = expDate < now;
      const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      return {
        id: inv.id,
        branchId: inv.branchId,
        branchName: inv.branch.name,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        batchNumber: inv.batchNumber,
        quantity: inv.quantity,
        expiryDate: inv.expiryDate,
        shelfLocation: inv.shelfLocation,
        isExpired,
        daysRemaining: isExpired ? 0 : daysRemaining,
        supplierName: inv.supplier?.name || "\u2014"
      };
    });
    return {
      totalAlerts: formatted.length,
      expiredCount: formatted.filter((i) => i.isExpired).length,
      nearExpiryCount: formatted.filter((i) => !i.isExpired).length,
      items: formatted
    };
  }
};

// src/modules/inventory/inventory.controller.ts
var InventoryController = class {
  static async getBranchInventory(req, res) {
    try {
      const user = req.user;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      let targetBranchId = req.params.branchId || req.query.branchId || req.headers["x-branch-id"];
      if (!isOwner && user.branchId) {
        targetBranchId = user.branchId;
      } else if (targetBranchId === "all" || targetBranchId === "all-branches") {
        targetBranchId = void 0;
      }
      const query = {
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        search: req.query.search,
        category: req.query.category
      };
      const result = await InventoryService.getBranchInventory(tenantId, targetBranchId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async inwardStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await InventoryService.inwardStock(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Stock inward recorded successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async adjustStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await InventoryService.adjustStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock adjusted successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateInventoryItem(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const updated = await InventoryService.updateInventoryItem(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Inventory item updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async allocateStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await InventoryService.allocateStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock allocated successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async moveStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await InventoryService.moveStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock moved successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async removeExpiredStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await InventoryService.removeExpiredStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Expired stock removed successfully and logged in movement ledger",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listMovements(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      if (query.type === "PURCHASE") {
        const result2 = await InventoryService.listReceivingHistory(tenantId, query, userRole, userBranchId);
        res.status(200).json({ success: true, ...result2 });
        return;
      }
      const result = await InventoryService.listMovements(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async listReceivingHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await InventoryService.listReceivingHistory(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getLowStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await InventoryService.getLowStockItems(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getNearExpiry(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await InventoryService.getNearExpiryItems(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getPosBatches(req, res) {
    try {
      const { branchId, productId } = req.query;
      const tenantId = req.user.tenantId;
      if (!branchId || !productId) {
        res.status(400).json({ success: false, message: "branchId and productId are required" });
        return;
      }
      const batches = await InventoryService.getPosAvailableBatches(tenantId, branchId, productId);
      res.status(200).json({ success: true, data: batches });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getBatchDetails(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const batch = await InventoryService.getBatchDetails(tenantId, id);
      res.status(200).json({ success: true, data: batch });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
};

// src/modules/inventory/inventory.validation.ts
import { z as z9 } from "zod";
var inwardStockSchema = z9.object({
  branchId: z9.string().min(1, "Branch is required"),
  productId: z9.string().min(1, "Product is required"),
  supplierId: z9.string().optional().nullable(),
  contactPersonId: z9.string().optional().nullable(),
  contactPersonName: z9.string().optional().nullable(),
  batchNumber: z9.string().optional().nullable(),
  barcode: z9.string().optional().nullable(),
  mfgDate: z9.string().optional().nullable(),
  expiryDate: z9.string().optional().nullable(),
  packageType: z9.string().optional().nullable().default("Medicine"),
  receivingUnit: z9.enum(["CARTON", "BOX"]).optional().default("CARTON"),
  cartonsReceived: z9.number().int().nonnegative().optional().nullable(),
  boxesReceived: z9.number().int().nonnegative().optional().nullable(),
  cartonQuantity: z9.number().int().nonnegative().optional().nullable(),
  boxesPerCarton: z9.number().int().nonnegative().optional().nullable(),
  boxQuantity: z9.number().int().nonnegative().optional().nullable(),
  stripsPerBox: z9.number().int().nonnegative().optional().nullable(),
  tabletsPerStrip: z9.number().int().nonnegative().optional().nullable(),
  quantity: z9.number().int().positive("Calculated quantity must be at least 1"),
  purchasePrice: z9.number().nonnegative().optional().nullable(),
  sellingPrice: z9.number().nonnegative().optional().nullable(),
  boxPurchasePrice: z9.number().nonnegative().optional().nullable(),
  boxSellingPrice: z9.number().nonnegative().optional().nullable(),
  shelfLocation: z9.string().optional().nullable(),
  paidAmount: z9.number().nonnegative().optional().default(0),
  financialAccountId: z9.string().optional().nullable(),
  notes: z9.string().optional().nullable(),
  receivedDate: z9.string().optional().nullable(),
  invoiceNo: z9.string().optional().nullable()
});
var adjustStockSchema = z9.object({
  branchId: z9.string().min(1, "Branch ID is required"),
  productId: z9.string().min(1, "Product ID is required"),
  inventoryId: z9.string().optional().nullable(),
  quantity: z9.number().int("Quantity must be an integer"),
  // positive to add, negative to subtract
  type: z9.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN",
    "ALLOCATION",
    "LOCATION_TRANSFER"
  ]).default("ADJUSTMENT"),
  batchNumber: z9.string().optional().nullable(),
  expiryDate: z9.string().optional().nullable(),
  minStockLevel: z9.number().int().nonnegative().optional(),
  lowStockThreshold: z9.number().int().nonnegative().optional(),
  reason: z9.string().optional().nullable()
});
var updateInventoryItemSchema = z9.object({
  quantity: z9.number().int().nonnegative().optional(),
  batchNumber: z9.string().optional().nullable(),
  barcode: z9.string().optional().nullable(),
  expiryDate: z9.string().optional().nullable(),
  shelfLocation: z9.string().optional().nullable(),
  purchasePrice: z9.number().nonnegative().optional().nullable(),
  sellingPrice: z9.number().nonnegative().optional().nullable(),
  minStockLevel: z9.number().int().nonnegative().optional(),
  lowStockThreshold: z9.number().int().nonnegative().optional()
});
var listMovementsQuerySchema = z9.object({
  page: z9.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z9.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  branchId: z9.string().optional(),
  productId: z9.string().optional(),
  inventoryId: z9.string().optional(),
  batchNumber: z9.string().optional(),
  locationId: z9.string().optional(),
  type: z9.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN",
    "ALLOCATION",
    "LOCATION_TRANSFER"
  ]).optional(),
  search: z9.string().optional(),
  startDate: z9.string().optional(),
  endDate: z9.string().optional()
});
var inventoryAlertsQuerySchema = z9.object({
  branchId: z9.string().optional(),
  daysThreshold: z9.string().optional().transform((v) => v ? parseInt(v, 10) : 30)
});
var allocateStockSchema = z9.object({
  inventoryId: z9.string().min(1, "Inventory/Batch ID is required"),
  rackId: z9.string().optional().nullable(),
  shelfId: z9.string().optional().nullable(),
  binId: z9.string().optional().nullable(),
  rack: z9.string().optional().nullable(),
  shelf: z9.string().optional().nullable(),
  bin: z9.string().optional().nullable(),
  quantity: z9.number().int().positive("Quantity must be greater than 0"),
  allocationSource: z9.enum(["FROM_CARTON", "CARTON", "LOOSE_BOX", "LOOSE_STRIP", "LOOSE_TABLET", "AUTO"]).optional().default("AUTO"),
  packagingUnit: z9.string().optional().nullable(),
  cartonsAllocated: z9.number().int().nonnegative().optional().nullable(),
  boxesAllocated: z9.number().int().nonnegative().optional().nullable(),
  stripsAllocated: z9.number().int().nonnegative().optional().nullable(),
  tabletsAllocated: z9.number().int().nonnegative().optional().nullable(),
  notes: z9.string().optional().nullable()
});
var moveStockSchema = z9.object({
  fromLocationId: z9.string().min(1, "Source Location ID is required"),
  rackId: z9.string().optional().nullable(),
  shelfId: z9.string().optional().nullable(),
  binId: z9.string().optional().nullable(),
  rack: z9.string().optional().nullable(),
  shelf: z9.string().optional().nullable(),
  bin: z9.string().optional().nullable(),
  quantity: z9.number().int().positive("Quantity must be greater than 0"),
  notes: z9.string().optional().nullable()
});
var removeExpiredStockSchema = z9.object({
  branchId: z9.string().min(1, "Branch ID is required"),
  inventoryId: z9.string().min(1, "Inventory/Batch ID is required"),
  source: z9.enum(["BULK", "LOCATION"]),
  locationId: z9.string().optional().nullable(),
  quantity: z9.number().int().positive("Quantity must be greater than 0"),
  reason: z9.string().optional().nullable(),
  notes: z9.string().optional().nullable()
});
var posBatchQuerySchema = z9.object({
  branchId: z9.string().min(1, "Branch ID is required"),
  productId: z9.string().min(1, "Product ID is required")
});

// src/modules/inventory/inventory.routes.ts
var router9 = Router9();
router9.use(authenticate, requireActiveSubscription);
router9.post(
  "/inward",
  requirePermission("stock.add_stock"),
  validateRequest({ body: inwardStockSchema }),
  InventoryController.inwardStock
);
router9.post(
  "/adjust",
  requirePermission("stock.add_stock"),
  validateRequest({ body: adjustStockSchema }),
  InventoryController.adjustStock
);
router9.post(
  "/allocate",
  requirePermission("stock.allocation"),
  validateRequest({ body: allocateStockSchema }),
  InventoryController.allocateStock
);
router9.post(
  "/move",
  requirePermission("stock.allocation"),
  validateRequest({ body: moveStockSchema }),
  InventoryController.moveStock
);
router9.post(
  "/remove-expired",
  requirePermission("stock.damaged"),
  validateRequest({ body: removeExpiredStockSchema }),
  InventoryController.removeExpiredStock
);
router9.patch(
  "/:id",
  requirePermission("stock.stock_list"),
  validateRequest({ body: updateInventoryItemSchema }),
  InventoryController.updateInventoryItem
);
router9.get(
  "/receiving-history",
  requirePermission("stock.stock_history"),
  InventoryController.listReceivingHistory
);
router9.get(
  "/movements",
  requirePermission("stock.stock_history"),
  validateRequest({ query: listMovementsQuerySchema }),
  InventoryController.listMovements
);
router9.get(
  "/movements/:branchId",
  requirePermission("stock.stock_history"),
  (req, res) => {
    req.query.branchId = req.params.branchId;
    return InventoryController.listMovements(req, res);
  }
);
router9.get(
  "/low-stock",
  requirePermission("stock.stock_list"),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getLowStock
);
router9.get(
  "/near-expiry",
  requirePermission("stock.stock_list"),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getNearExpiry
);
router9.get(
  "/pos-batches",
  requirePermission("pos.manage"),
  validateRequest({ query: posBatchQuerySchema }),
  InventoryController.getPosBatches
);
router9.get(
  "/batch/:id",
  requirePermission("stock.stock_list"),
  InventoryController.getBatchDetails
);
router9.get(
  "/branch/:branchId",
  requirePermission("stock.stock_list"),
  InventoryController.getBranchInventory
);
router9.get(
  "/",
  requirePermission("stock.stock_list"),
  (req, res) => {
    const branchId = req.query.branchId || req.headers["x-branch-id"] || req.user?.branchId || "all";
    req.params.branchId = branchId;
    return InventoryController.getBranchInventory(req, res);
  }
);
var inventoryRoutes = router9;

// src/modules/transfer/transfer.routes.ts
import { Router as Router10 } from "express";

// src/modules/transfer/transfer.service.ts
var TransferService = class {
  /**
   * 1. Create & Dispatch Inter-Branch Stock Transfer
   * Stock is immediately deducted from source branch inventory upon dispatch.
   */
  static async createTransfer(tenantId, userId, data) {
    if (data.fromBranchId === data.toBranchId) {
      throw new Error("Source and destination branches cannot be the same.");
    }
    const [fromBranch, toBranch] = await Promise.all([
      prisma.branch.findFirst({ where: { id: data.fromBranchId, tenantId, isActive: true } }),
      prisma.branch.findFirst({ where: { id: data.toBranchId, tenantId, isActive: true } })
    ]);
    if (!fromBranch || !toBranch) {
      throw new Error("One or both branches are invalid or inactive.");
    }
    let sentTotalValue = 0;
    const validatedItems = [];
    for (const item of data.items) {
      let inv = null;
      if (item.inventoryId) {
        inv = await prisma.inventory.findFirst({
          where: {
            id: item.inventoryId,
            branchId: data.fromBranchId
          }
        });
      }
      if (!inv) {
        inv = await prisma.inventory.findFirst({
          where: {
            branchId: data.fromBranchId,
            productId: item.productId,
            ...item.batchNumber ? { batchNumber: item.batchNumber } : {}
          }
        });
      }
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (!product) {
        throw new Error(`Product ID ${item.productId} not found.`);
      }
      const availableQty = inv?.quantity || 0;
      if (availableQty < item.sentQuantity) {
        throw new Error(
          `Insufficient stock at ${fromBranch.name} for "${product.name}"${item.batchNumber ? ` (Batch: ${item.batchNumber})` : ""}. Available: ${availableQty}, Requested: ${item.sentQuantity}`
        );
      }
      const effectiveCostPrice = Number(item.costPrice ?? inv?.purchasePrice ?? product.basePrice ?? 0);
      const sentValue = Number(item.sentQuantity) * effectiveCostPrice;
      sentTotalValue += sentValue;
      validatedItems.push({
        ...item,
        inventory: inv,
        product,
        costPrice: effectiveCostPrice,
        sentValue,
        batchNumber: item.batchNumber || inv?.batchNumber || "DEFAULT",
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : inv?.expiryDate || null,
        packageType: item.packageType || inv?.packageType || product.defaultPackType || "PIECE"
      });
    }
    const transfer = await prisma.$transaction(async (tx) => {
      const createdTransfer = await tx.stockTransfer.create({
        data: {
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          status: "IN_TRANSIT",
          requestedBy: userId,
          sentTotalValue,
          receivedTotalValue: 0,
          damagedTotalValue: 0,
          missingTotalValue: 0,
          payableAmount: 0,
          paidAmount: 0,
          remainingDue: 0,
          settlementStatus: "UNPAID",
          notes: data.notes || null,
          // Professional Courier Logistics & Delivery Details
          courierName: data.courierName || null,
          courierHub: data.courierHub || null,
          trackingId: data.trackingId || null,
          deliveryPersonName: data.deliveryPersonName || null,
          deliveryPersonContact: data.deliveryPersonContact || null,
          dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : /* @__PURE__ */ new Date(),
          deliveryNote: data.deliveryNote || null,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              inventoryId: item.inventory?.id || null,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              packageType: item.packageType,
              packageQuantity: item.packageQuantity || null,
              conversionFactor: item.conversionFactor || 1,
              sentQuantity: item.sentQuantity,
              receivedQuantity: 0,
              damagedQuantity: 0,
              missingQuantity: 0,
              costPrice: item.costPrice,
              sentValue: item.sentValue,
              receivedValue: 0,
              damagedValue: 0,
              missingValue: 0,
              itemStatus: "PENDING"
            }))
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, genericName: true, sku: true, unit: true }
              }
            }
          },
          fromBranch: { select: { id: true, name: true, location: true } },
          toBranch: { select: { id: true, name: true, location: true } }
        }
      });
      for (const item of validatedItems) {
        if (item.inventory) {
          await tx.inventory.update({
            where: { id: item.inventory.id },
            data: {
              quantity: { decrement: item.sentQuantity }
            }
          });
        }
        await tx.stockMovement.create({
          data: {
            branchId: data.fromBranchId,
            productId: item.productId,
            inventoryId: item.inventory?.id || null,
            batchNumber: item.batchNumber,
            type: "TRANSFER_OUT",
            quantity: -item.sentQuantity,
            unitPrice: item.costPrice,
            reason: `Dispatched to ${toBranch.name} (Transfer #${createdTransfer.id.substring(0, 8)})`,
            referenceId: createdTransfer.id,
            performedBy: userId
          }
        });
      }
      return createdTransfer;
    });
    await prisma.notification.create({
      data: {
        tenantId,
        branchId: data.toBranchId,
        title: "Incoming Stock Shipment",
        message: `Transfer #${transfer.id.substring(0, 8)} sent from ${fromBranch.name}. Total cost valuation: \u09F3${sentTotalValue.toFixed(2)}.`,
        type: "SYSTEM"
      }
    });
    await AuditService.log({
      tenantId,
      branchId: data.fromBranchId,
      userId,
      action: "STOCK_TRANSFER_DISPATCHED",
      details: {
        transferId: transfer.id,
        fromBranch: fromBranch.name,
        toBranch: toBranch.name,
        itemsCount: transfer.items.length,
        sentTotalValue
      }
    });
    return transfer;
  }
  /**
   * 2. Receive Stock at Destination Branch
   * Detailed breakdown: Received, Damaged, and Missing quantities.
   * Only successfully received items are added to destination usable stock.
   * Automatically calculates cost-based payable amount.
   */
  static async receiveTransfer(transferId, tenantId, userId, data) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId }
      },
      include: {
        items: true,
        fromBranch: true,
        toBranch: true
      }
    });
    if (!transfer) {
      throw new Error("Transfer record not found.");
    }
    if (transfer.status === "COMPLETED" || transfer.status === "RECEIVED") {
      throw new Error(`This transfer has already been received and finalized.`);
    }
    if (transfer.status === "CANCELLED" || transfer.status === "REJECTED") {
      throw new Error(`Cannot receive a transfer with status ${transfer.status}.`);
    }
    const receiptMap = new Map(data.items.map((i) => [i.itemId, i]));
    let receivedTotalValue = 0;
    let damagedTotalValue = 0;
    let missingTotalValue = 0;
    const itemUpdates = [];
    for (const item of transfer.items) {
      const receipt = receiptMap.get(item.id);
      if (!receipt) {
        throw new Error(`Missing receiving entry for transfer item ${item.id}.`);
      }
      const receivedQty = Number(receipt.receivedQuantity || 0);
      const damagedQty = Number(receipt.damagedQuantity || 0);
      const missingQty = Number(receipt.missingQuantity || 0);
      const totalAccounted = receivedQty + damagedQty + missingQty;
      if (totalAccounted !== item.sentQuantity) {
        throw new Error(
          `Quantities for product item mismatch sent amount. Sent: ${item.sentQuantity}, Received + Damaged + Missing: ${totalAccounted}.`
        );
      }
      const costPrice = Number(item.costPrice || 0);
      const receivedValue = receivedQty * costPrice;
      const damagedValue = damagedQty * costPrice;
      const missingValue = missingQty * costPrice;
      receivedTotalValue += receivedValue;
      damagedTotalValue += damagedValue;
      missingTotalValue += missingValue;
      let itemStatus = "RECEIVED";
      if (receivedQty === 0 && damagedQty > 0) itemStatus = "DAMAGED";
      else if (receivedQty === 0 && missingQty > 0) itemStatus = "MISSING";
      else if (damagedQty > 0 || missingQty > 0) itemStatus = "PARTIALLY_RECEIVED";
      itemUpdates.push({
        id: item.id,
        productId: item.productId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        packageType: item.packageType,
        conversionFactor: item.conversionFactor,
        costPrice,
        receivedQuantity: receivedQty,
        damagedQuantity: damagedQty,
        missingQuantity: missingQty,
        receivedValue,
        damagedValue,
        missingValue,
        itemStatus,
        notes: receipt.notes || null
      });
    }
    const payableAmount = receivedTotalValue;
    const remainingDue = payableAmount;
    const finalized = await prisma.$transaction(async (tx) => {
      for (const iu of itemUpdates) {
        await tx.transferItem.update({
          where: { id: iu.id },
          data: {
            receivedQuantity: iu.receivedQuantity,
            damagedQuantity: iu.damagedQuantity,
            missingQuantity: iu.missingQuantity,
            receivedValue: iu.receivedValue,
            damagedValue: iu.damagedValue,
            missingValue: iu.missingValue,
            itemStatus: iu.itemStatus,
            notes: iu.notes
          }
        });
        if (iu.receivedQuantity > 0) {
          const existingDestInv = await tx.inventory.findFirst({
            where: {
              branchId: transfer.toBranchId,
              productId: iu.productId,
              ...iu.batchNumber ? { batchNumber: iu.batchNumber } : {}
            }
          });
          if (existingDestInv) {
            await tx.inventory.update({
              where: { id: existingDestInv.id },
              data: {
                quantity: { increment: iu.receivedQuantity },
                purchasePrice: iu.costPrice,
                receivedDate: /* @__PURE__ */ new Date()
              }
            });
          } else {
            await tx.inventory.create({
              data: {
                branchId: transfer.toBranchId,
                productId: iu.productId,
                quantity: iu.receivedQuantity,
                initialQuantity: iu.receivedQuantity,
                batchNumber: iu.batchNumber,
                expiryDate: iu.expiryDate,
                packageType: iu.packageType,
                purchasePrice: iu.costPrice,
                receivedDate: /* @__PURE__ */ new Date(),
                minStockLevel: 10,
                lowStockThreshold: 5
              }
            });
          }
          await tx.stockMovement.create({
            data: {
              branchId: transfer.toBranchId,
              productId: iu.productId,
              batchNumber: iu.batchNumber,
              type: "TRANSFER_IN",
              quantity: iu.receivedQuantity,
              unitPrice: iu.costPrice,
              reason: `Received from ${transfer.fromBranch.name} (Transfer #${transfer.id.substring(0, 8)})`,
              referenceId: transfer.id,
              performedBy: userId
            }
          });
        }
        if (iu.damagedQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              branchId: transfer.toBranchId,
              productId: iu.productId,
              batchNumber: iu.batchNumber,
              type: "DAMAGE",
              quantity: -iu.damagedQuantity,
              unitPrice: iu.costPrice,
              reason: `Transit Damage on Transfer #${transfer.id.substring(0, 8)} from ${transfer.fromBranch.name}`,
              referenceId: transfer.id,
              performedBy: userId
            }
          });
        }
      }
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "RECEIVED",
          receivedBy: userId,
          receivedDate: /* @__PURE__ */ new Date(),
          receivedTotalValue,
          damagedTotalValue,
          missingTotalValue,
          payableAmount: 0,
          paidAmount: 0,
          remainingDue: 0,
          settlementStatus: "PAID",
          notes: data.notes ? `${transfer.notes || ""}
${data.notes}`.trim() : transfer.notes
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, genericName: true, sku: true, unit: true }
              }
            }
          },
          fromBranch: { select: { id: true, name: true, location: true } },
          toBranch: { select: { id: true, name: true, location: true } }
        }
      });
      return updatedTransfer;
    });
    await AuditService.log({
      tenantId,
      branchId: transfer.toBranchId,
      userId,
      action: "STOCK_TRANSFER_RECEIVED",
      details: {
        transferId: transfer.id,
        receivedTotalValue,
        damagedTotalValue,
        missingTotalValue
      }
    });
    return this.getTransferDetails(transferId, tenantId);
  }
  /**
   * 3. Settle Inter-Branch Transfer Payable
   * Debits destination branch account, credits source branch account, updates due & status.
   */
  static async settleTransfer(transferId, tenantId, userId, data) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId }
      },
      include: {
        fromBranch: true,
        toBranch: true,
        settlements: true
      }
    });
    if (!transfer) {
      throw new Error("Transfer record not found.");
    }
    if (transfer.status !== "RECEIVED" && transfer.status !== "COMPLETED") {
      throw new Error(`Transfer must be received before settlement can be recorded.`);
    }
    const currentRemainingDue = Number(transfer.remainingDue || 0);
    if (currentRemainingDue <= 0) {
      throw new Error("This transfer is already fully settled.");
    }
    const settlementAmount = Number(data.amount);
    if (settlementAmount <= 0) {
      throw new Error("Settlement amount must be greater than zero.");
    }
    if (settlementAmount > currentRemainingDue + 0.05) {
      throw new Error(
        `Settlement amount (\u09F3${settlementAmount.toFixed(2)}) exceeds remaining due (\u09F3${currentRemainingDue.toFixed(2)}).`
      );
    }
    const sourceAccount = await prisma.financialAccount.findFirst({
      where: {
        id: data.sourceAccountId,
        tenantId,
        branchId: transfer.toBranchId,
        isActive: true
      }
    });
    if (!sourceAccount) {
      throw new Error(`Paying financial account not found at ${transfer.toBranch.name}.`);
    }
    const destAccount = await prisma.financialAccount.findFirst({
      where: {
        id: data.destinationAccountId,
        tenantId,
        branchId: transfer.fromBranchId,
        isActive: true
      }
    });
    if (!destAccount) {
      throw new Error(`Receiving financial account not found at ${transfer.fromBranch.name}.`);
    }
    const result = await prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({
        where: { id: sourceAccount.id },
        data: {
          balance: { decrement: settlementAmount }
        }
      });
      await tx.financialAccount.update({
        where: { id: destAccount.id },
        data: {
          balance: { increment: settlementAmount }
        }
      });
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: transfer.toBranchId,
          sourceAccountId: sourceAccount.id,
          amount: settlementAmount,
          type: "TRANSFER",
          reference: data.reference || `Transfer #${transfer.id.substring(0, 8)} Settlement`,
          note: `Inter-branch payment to ${transfer.fromBranch.name} (${destAccount.name})`,
          userId
        }
      });
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: transfer.fromBranchId,
          destinationAccountId: destAccount.id,
          amount: settlementAmount,
          type: "TRANSFER",
          reference: data.reference || `Transfer #${transfer.id.substring(0, 8)} Settlement`,
          note: `Inter-branch payment received from ${transfer.toBranch.name} (${sourceAccount.name})`,
          userId
        }
      });
      const settlement = await tx.transferSettlement.create({
        data: {
          transferId: transfer.id,
          tenantId,
          fromBranchId: transfer.fromBranchId,
          toBranchId: transfer.toBranchId,
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destAccount.id,
          amount: settlementAmount,
          paymentMethod: data.paymentMethod || sourceAccount.type || "CASH",
          reference: data.reference || null,
          notes: data.notes || null,
          paidBy: userId
        }
      });
      const newPaidAmount = Number(transfer.paidAmount || 0) + settlementAmount;
      const newRemainingDue = Math.max(0, Number(transfer.payableAmount || 0) - newPaidAmount);
      const newSettlementStatus = newRemainingDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";
      const updated = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          paidAmount: newPaidAmount,
          remainingDue: newRemainingDue,
          settlementStatus: newSettlementStatus,
          settlementDate: /* @__PURE__ */ new Date(),
          status: newSettlementStatus === "PAID" ? "COMPLETED" : transfer.status
        }
      });
      return { settlement, updated };
    });
    await AuditService.log({
      tenantId,
      branchId: transfer.toBranchId,
      userId,
      action: "STOCK_TRANSFER_SETTLED",
      details: {
        transferId: transfer.id,
        amount: settlementAmount,
        payingAccount: sourceAccount.name,
        receivingAccount: destAccount.name,
        settlementStatus: result.updated.settlementStatus
      }
    });
    return this.getTransferDetails(transferId, tenantId);
  }
  /**
   * 4. List Transfers with Filtering
   */
  static async listTransfers(tenantId, query, userRole, userBranchId) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where = {
      fromBranch: { tenantId }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.OR = [
        { fromBranchId: userBranchId },
        { toBranchId: userBranchId }
      ];
    } else if (query.branchId) {
      where.OR = [
        { fromBranchId: query.branchId },
        { toBranchId: query.branchId }
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.settlementStatus) {
      where.settlementStatus = query.settlementStatus;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const [total, transfers] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          fromBranch: { select: { id: true, name: true, location: true } },
          toBranch: { select: { id: true, name: true, location: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  genericName: true,
                  sku: true,
                  unit: true,
                  category: true,
                  defaultPackType: true,
                  stripsPerBox: true,
                  tabletsPerStrip: true
                }
              }
            }
          },
          settlements: {
            include: {
              sourceAccount: { select: { id: true, name: true, type: true } },
              destinationAccount: { select: { id: true, name: true, type: true } }
            }
          }
        }
      })
    ]);
    return {
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * 5. Get Transfer Details
   */
  static async getTransferDetails(transferId, tenantId) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId }
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                genericName: true,
                sku: true,
                unit: true,
                basePrice: true,
                category: true,
                defaultPackType: true,
                stripsPerBox: true,
                tabletsPerStrip: true
              }
            }
          }
        },
        settlements: {
          include: {
            sourceAccount: { select: { id: true, name: true, type: true, accountNumber: true } },
            destinationAccount: { select: { id: true, name: true, type: true, accountNumber: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!transfer) {
      throw new Error("Transfer not found.");
    }
    return transfer;
  }
  /**
   * 6. Cancel Pending Transfer
   */
  static async cancelTransfer(transferId, tenantId, userId) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId }
      },
      include: {
        items: true,
        fromBranch: true
      }
    });
    if (!transfer) {
      throw new Error("Transfer not found.");
    }
    if (transfer.status !== "IN_TRANSIT" && transfer.status !== "PENDING") {
      throw new Error(`Cannot cancel a transfer with status ${transfer.status}.`);
    }
    const cancelled = await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        if (item.inventoryId) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantity: { increment: item.sentQuantity }
            }
          });
        }
        await tx.stockMovement.create({
          data: {
            branchId: transfer.fromBranchId,
            productId: item.productId,
            batchNumber: item.batchNumber,
            type: "ADJUSTMENT",
            quantity: item.sentQuantity,
            unitPrice: item.costPrice,
            reason: `Cancelled transfer #${transfer.id.substring(0, 8)} refund`,
            referenceId: transfer.id,
            performedBy: userId
          }
        });
      }
      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "CANCELLED"
        }
      });
    });
    await AuditService.log({
      tenantId,
      branchId: transfer.fromBranchId,
      userId,
      action: "STOCK_TRANSFER_CANCELLED",
      details: { transferId: transfer.id }
    });
    return cancelled;
  }
  /**
   * 6. List Damaged Products & Losses from Inter-Branch Transfers
   */
  static async getDamagedProducts(tenantId, userRole, userBranchId, query) {
    const where = {
      product: {
        tenantId
      },
      OR: [
        { damagedQuantity: { gt: 0 } },
        { missingQuantity: { gt: 0 } }
      ]
    };
    if (query?.branchId) {
      where.transfer = {
        OR: [
          { fromBranchId: query.branchId },
          { toBranchId: query.branchId }
        ]
      };
    } else if (userRole === "BRANCH_MANAGER" && userBranchId) {
      where.transfer = {
        OR: [
          { fromBranchId: userBranchId },
          { toBranchId: userBranchId }
        ]
      };
    }
    if (query?.search) {
      where.product = {
        ...where.product,
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { genericName: { contains: query.search, mode: "insensitive" } }
        ]
      };
    }
    if (query?.startDate || query?.endDate) {
      const dateFilter = {};
      if (query?.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (query?.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.transfer = {
        ...where.transfer || {},
        createdAt: dateFilter
      };
    }
    const items = await prisma.transferItem.findMany({
      where,
      orderBy: { transfer: { transferDate: "desc" } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            genericName: true,
            sku: true,
            unit: true,
            category: true,
            defaultPackType: true,
            stripsPerBox: true,
            tabletsPerStrip: true
          }
        },
        transfer: {
          select: {
            id: true,
            status: true,
            settlementStatus: true,
            transferDate: true,
            receivedDate: true,
            notes: true,
            fromBranch: { select: { id: true, name: true, location: true } },
            toBranch: { select: { id: true, name: true, location: true } }
          }
        }
      }
    });
    const totalDamagedUnits = items.reduce((acc, item) => acc + (item.damagedQuantity || 0), 0);
    const totalMissingUnits = items.reduce((acc, item) => acc + (item.missingQuantity || 0), 0);
    const totalDamagedValue = items.reduce((acc, item) => acc + Number(item.damagedValue || 0), 0);
    const totalMissingValue = items.reduce((acc, item) => acc + Number(item.missingValue || 0), 0);
    const totalLossValue = totalDamagedValue + totalMissingValue;
    return {
      summary: {
        totalDamagedUnits,
        totalMissingUnits,
        totalDamagedValue,
        totalMissingValue,
        totalLossValue,
        incidentCount: items.length
      },
      data: items
    };
  }
};

// src/modules/transfer/transfer.controller.ts
var TransferController = class {
  static async createTransfer(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      if (userRole === "BRANCH_MANAGER" && userBranchId && req.body.fromBranchId !== userBranchId) {
        res.status(403).json({
          success: false,
          message: "Branch Managers can only dispatch stock transfers from their assigned branch."
        });
        return;
      }
      const transfer = await TransferService.createTransfer(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Inter-branch stock transfer dispatched successfully",
        data: transfer
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listTransfers(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await TransferService.listTransfers(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getTransferDetails(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const transfer = await TransferService.getTransferDetails(id, tenantId);
      res.status(200).json({ success: true, data: transfer });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async receiveTransfer(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await TransferService.receiveTransfer(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock shipment received and verified successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async settleTransfer(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await TransferService.settleTransfer(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Inter-branch payment settlement recorded successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async cancelTransfer(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await TransferService.cancelTransfer(id, tenantId, userId);
      res.status(200).json({
        success: true,
        message: "Transfer cancelled and stock returned to source branch",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getDamagedProducts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = {
        branchId: req.query.branchId,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      const result = await TransferService.getDamagedProducts(tenantId, userRole, userBranchId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/modules/transfer/transfer.validation.ts
import { z as z10 } from "zod";
var transferItemInputSchema = z10.object({
  productId: z10.string().uuid("Valid product ID required"),
  inventoryId: z10.string().uuid().optional().nullable(),
  batchNumber: z10.string().optional().nullable(),
  expiryDate: z10.string().optional().nullable(),
  packageType: z10.string().optional().default("PIECE"),
  packageQuantity: z10.number().int().min(1).optional().nullable(),
  conversionFactor: z10.number().int().min(1).optional().default(1),
  sentQuantity: z10.number().int().min(1, "Sent quantity must be at least 1 lowest unit"),
  costPrice: z10.number().min(0, "Cost price must be non-negative")
});
var createTransferSchema = z10.object({
  fromBranchId: z10.string().uuid("Valid source branch ID required"),
  toBranchId: z10.string().uuid("Valid destination branch ID required"),
  notes: z10.string().optional().nullable(),
  // Courier Logistics Information
  courierName: z10.string().optional().nullable(),
  courierHub: z10.string().optional().nullable(),
  trackingId: z10.string().optional().nullable(),
  deliveryPersonName: z10.string().optional().nullable(),
  deliveryPersonContact: z10.string().optional().nullable(),
  dispatchDate: z10.string().optional().nullable(),
  deliveryNote: z10.string().optional().nullable(),
  items: z10.array(transferItemInputSchema).min(1, "At least one product item must be included in transfer")
});
var receiveItemInputSchema = z10.object({
  itemId: z10.string().uuid("Valid transfer item ID required"),
  receivedQuantity: z10.number().int().min(0, "Received quantity must be non-negative"),
  damagedQuantity: z10.number().int().min(0).default(0),
  missingQuantity: z10.number().int().min(0).default(0),
  notes: z10.string().optional().nullable()
});
var receiveTransferSchema = z10.object({
  items: z10.array(receiveItemInputSchema).min(1, "At least one receive item entry required"),
  notes: z10.string().optional().nullable()
});
var settleTransferSchema = z10.object({
  sourceAccountId: z10.string().uuid("Valid paying account ID required"),
  destinationAccountId: z10.string().uuid("Valid receiving account ID required"),
  amount: z10.number().min(0.01, "Settlement amount must be greater than 0"),
  paymentMethod: z10.string().default("CASH"),
  reference: z10.string().optional().nullable(),
  notes: z10.string().optional().nullable()
});
var listTransfersQuerySchema = z10.object({
  branchId: z10.string().uuid().optional(),
  status: z10.string().optional(),
  settlementStatus: z10.string().optional(),
  search: z10.string().optional(),
  startDate: z10.string().optional(),
  endDate: z10.string().optional(),
  page: z10.coerce.number().int().positive().default(1),
  limit: z10.coerce.number().int().positive().max(100).default(20)
});

// src/modules/transfer/transfer.routes.ts
var router10 = Router10();
router10.use(authenticate, requireActiveSubscription);
router10.get(
  "/damaged-products",
  requirePermission("stock.damaged"),
  TransferController.getDamagedProducts
);
router10.get(
  "/",
  requirePermission("stock.transfer_history"),
  validateRequest({ query: listTransfersQuerySchema }),
  TransferController.listTransfers
);
router10.get(
  "/:id",
  requirePermission("stock.transfer_history"),
  TransferController.getTransferDetails
);
router10.post(
  "/",
  requirePermission("stock.transfer"),
  validateRequest({ body: createTransferSchema }),
  TransferController.createTransfer
);
router10.post(
  "/:id/receive",
  requirePermission("stock.receive"),
  validateRequest({ body: receiveTransferSchema }),
  TransferController.receiveTransfer
);
router10.post(
  "/:id/settle",
  requirePermission("stock.receive"),
  validateRequest({ body: settleTransferSchema }),
  TransferController.settleTransfer
);
router10.post(
  "/:id/cancel",
  requirePermission("stock.transfer"),
  TransferController.cancelTransfer
);

// src/modules/sales/sales.routes.ts
import { Router as Router11 } from "express";

// src/modules/sales/sales.service.ts
var SalesService = class {
  /**
   * Process POS Sale with FEFO Batch Deduction, Multi-Unit conversions, and Invoice details
   */
  static async createSale(tenantId, userId, data) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId, isActive: true }
    });
    if (!branch) {
      throw new Error("Branch not found or inactive");
    }
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, isActive: true },
      include: {
        branchOverrides: { where: { branchId: data.branchId } }
      }
    });
    if (products.length !== productIds.length) {
      throw new Error("One or more items in the cart are invalid or inactive");
    }
    const productMap = new Map(products.map((p) => [p.id, p]));
    const prescriptionItems = products.filter(
      (p) => p.requiresPrescription
    );
    if (prescriptionItems.length > 0 && !data.prescriptionRef?.trim() && !data.managerApprovedBy?.trim()) {
      const names = prescriptionItems.map((p) => p.name).join(", ");
      throw new Error(
        `Prescription Required: The item(s) "${names}" require a doctor prescription. Please provide the doctor prescription reference or confirmation details.`
      );
    }
    const now = /* @__PURE__ */ new Date();
    const availableBatches = await prisma.inventory.findMany({
      where: {
        branchId: data.branchId,
        productId: { in: productIds },
        quantity: { gt: 0 },
        OR: [{ expiryDate: null }, { expiryDate: { gt: now } }]
      },
      include: { locations: true },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }]
    });
    const batchMap = /* @__PURE__ */ new Map();
    for (const b of availableBatches) {
      if (!batchMap.has(b.productId)) {
        batchMap.set(b.productId, []);
      }
      batchMap.get(b.productId).push(b);
    }
    let calculatedSubTotal = 0;
    const preparedSaleItems = [];
    const stockDeductions = [];
    for (const item of data.items) {
      const prod = productMap.get(item.productId);
      const multiplier = item.unitMultiplier || 1;
      const totalBaseUnitsNeeded = item.quantity * multiplier;
      const override = prod.branchOverrides && prod.branchOverrides[0];
      const baseUnitPrice = override ? Number(override.price) : Number(prod.basePrice);
      const effectiveUnitPrice = item.unitPrice !== void 0 ? Number(item.unitPrice) : baseUnitPrice * multiplier;
      const itemSubTotal = effectiveUnitPrice * item.quantity;
      calculatedSubTotal += itemSubTotal;
      const batches = batchMap.get(item.productId) || [];
      const totalStockAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
      if (totalStockAvailable < totalBaseUnitsNeeded) {
        throw new Error(
          `Insufficient non-expired stock for "${prod.name}". Available: ${totalStockAvailable} base units, requested: ${totalBaseUnitsNeeded} (${item.quantity} ${item.unitType || "units"})`
        );
      }
      let targetBatch = null;
      let targetLocation = null;
      if (item.inventoryId) {
        targetBatch = batches.find((b) => b.id === item.inventoryId);
        if (!targetBatch) {
          throw new Error(`Selected batch not found or expired for "${prod.name}"`);
        }
        if (targetBatch.expiryDate && targetBatch.expiryDate <= now) {
          throw new Error(`Batch ${targetBatch.batchNumber} for "${prod.name}" has expired and cannot be sold.`);
        }
        if (!targetBatch.locations || targetBatch.locations.length === 0) {
          targetBatch.locations = [];
        }
        if (item.inventoryLocationId) {
          targetLocation = (targetBatch.locations || []).find((l) => l.id === item.inventoryLocationId);
          if (!targetLocation || targetLocation.quantity < totalBaseUnitsNeeded) {
            throw new Error(
              `Selected physical location for "${prod.name}" has insufficient stock (${targetLocation?.quantity || 0} available, ${totalBaseUnitsNeeded} needed).`
            );
          }
        } else {
          const sortedLocations = (targetBatch.locations || []).sort((a, b) => a.quantity - b.quantity);
          targetLocation = sortedLocations.find((l) => l.quantity >= totalBaseUnitsNeeded);
          if (!targetLocation && (targetBatch.locations || []).length > 0) {
            targetLocation = (targetBatch.locations || [])[0];
            if (targetLocation && targetLocation.quantity < totalBaseUnitsNeeded) {
              throw new Error(
                `No single physical location has enough stock for "${prod.name}". Please select a specific location with sufficient quantity.`
              );
            }
          }
        }
      } else {
        let unitsRemainingToDeduct = totalBaseUnitsNeeded;
        let primaryBatch = null;
        let primaryLocation = null;
        for (const batch of batches) {
          if (unitsRemainingToDeduct <= 0) break;
          if (batch.quantity <= 0) continue;
          if (batch.expiryDate && batch.expiryDate <= now) continue;
          const deductFromThisBatch = Math.min(batch.quantity, unitsRemainingToDeduct);
          batch.quantity -= deductFromThisBatch;
          unitsRemainingToDeduct -= deductFromThisBatch;
          if (!primaryBatch) {
            primaryBatch = batch;
            const sortedLocs = (batch.locations || []).sort((a, b) => a.quantity - b.quantity);
            primaryLocation = sortedLocs.length > 0 ? sortedLocs[0] : null;
          }
        }
        if (unitsRemainingToDeduct > 0) {
          throw new Error(
            `Insufficient non-expired stock for "${prod.name}". Need ${totalBaseUnitsNeeded} base units.`
          );
        }
        targetBatch = primaryBatch;
        targetLocation = primaryLocation;
      }
      stockDeductions.push({
        inventoryId: targetBatch.id,
        inventoryLocationId: targetLocation ? targetLocation.id : null,
        quantityToDeduct: totalBaseUnitsNeeded,
        productId: item.productId,
        inventoryLocationData: targetLocation || null
      });
      preparedSaleItems.push({
        productId: item.productId,
        inventoryId: targetBatch.id,
        inventoryLocationId: targetLocation ? targetLocation.id : null,
        batchNumber: targetBatch.batchNumber || item.batchNumber || null,
        expiryDate: targetBatch.expiryDate || null,
        unitType: item.unitType || prod.defaultPackType || "PIECE",
        unitMultiplier: multiplier,
        quantity: item.quantity,
        lowestUnitQuantity: totalBaseUnitsNeeded,
        unitPrice: effectiveUnitPrice,
        purchasePrice: targetBatch.purchasePrice || null,
        subTotal: itemSubTotal
      });
    }
    for (const deduction of stockDeductions) {
      if (deduction.inventoryLocationId && deduction.inventoryLocationData) {
        const loc = deduction.inventoryLocationData;
        if (loc.quantity < deduction.quantityToDeduct) {
          throw new Error(
            `Insufficient stock at physical location for this sale. Location has ${loc.quantity}, need ${deduction.quantityToDeduct}.`
          );
        }
      }
    }
    let discountAmount = 0;
    if (data.discount && data.discount > 0) {
      if (data.discountType === "PERCENT") {
        discountAmount = Math.round(calculatedSubTotal * (data.discount / 100) * 100) / 100;
      } else {
        discountAmount = Number(data.discount);
      }
    }
    const taxAmount = Number(data.tax || 0);
    const totalAmount = Math.max(0, calculatedSubTotal - discountAmount + taxAmount);
    const paidAmount = data.paidAmount !== void 0 ? Number(data.paidAmount) : totalAmount;
    const dueAmount = Math.max(0, totalAmount - paidAmount);
    const changeAmount = Math.max(0, paidAmount - totalAmount);
    const rand = Math.floor(1e3 + Math.random() * 9e3);
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(2, 10).replace(/-/g, "");
    const receiptNo = `INV-${branch.name.substring(0, 3).toUpperCase()}-${dateStr}-${rand}`;
    const localCreatedAt = data.localCreatedAt ? new Date(data.localCreatedAt) : /* @__PURE__ */ new Date();
    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          tenantId,
          branchId: data.branchId,
          userId,
          receiptNo,
          financialAccountId: data.financialAccountId || null,
          customerName: data.customerName || "Walk-in Customer",
          customerPhone: data.customerPhone || null,
          customerEmail: data.customerEmail || null,
          subTotal: calculatedSubTotal,
          discount: discountAmount,
          discountType: data.discountType || "FIXED",
          tax: taxAmount,
          totalAmount,
          paidAmount: Math.min(paidAmount, totalAmount),
          dueAmount,
          changeAmount,
          paymentMethod: data.paymentMethod,
          bankName: data.bankName || null,
          transactionRef: data.transactionRef || null,
          status: "COMPLETED",
          notes: data.notes || null,
          managerApprovedBy: data.managerApprovedBy || null,
          prescriptionRef: data.prescriptionRef || null,
          localCreatedAt,
          items: {
            create: preparedSaleItems
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, size: true, brandName: true }
              }
            }
          },
          branch: { select: { id: true, name: true, location: true, phone: true, email: true } },
          user: { select: { id: true, name: true, username: true } }
        }
      });
      for (const deduction of stockDeductions) {
        const locData = deduction.inventoryLocationData;
        const locLabel = locData ? `${locData.rack?.name || locData.rackName || "?"} \u2192 ${locData.shelf?.name || locData.shelfName || "?"} \u2192 ${locData.bin?.name || locData.binName || "?"}` : "Bulk Storage";
        await tx.inventory.update({
          where: { id: deduction.inventoryId },
          data: { quantity: { decrement: deduction.quantityToDeduct } }
        });
        if (deduction.inventoryLocationId && locData) {
          await tx.inventoryLocation.update({
            where: { id: deduction.inventoryLocationId },
            data: { quantity: { decrement: deduction.quantityToDeduct } }
          });
        }
        await tx.stockMovement.create({
          data: {
            branchId: data.branchId,
            productId: deduction.productId,
            inventoryId: deduction.inventoryId,
            fromLocationId: deduction.inventoryLocationId || null,
            type: "SALE",
            quantity: -deduction.quantityToDeduct,
            unitPrice: preparedSaleItems.find((i) => i.productId === deduction.productId)?.purchasePrice || 0,
            reason: `POS Sale Receipt #${receiptNo} [${locLabel}]`,
            referenceId: createdSale.id,
            performedBy: userId
          }
        });
      }
      const actualPaid = Math.min(paidAmount, totalAmount);
      if (actualPaid > 0) {
        let financialAccount = null;
        if (data.financialAccountId) {
          financialAccount = await tx.financialAccount.findFirst({
            where: { id: data.financialAccountId, tenantId, isActive: true }
          });
          if (!financialAccount) {
            throw new Error("Selected financial account is invalid or inactive.");
          }
          if (financialAccount.branchId && financialAccount.branchId !== data.branchId) {
            throw new Error("Selected financial account does not belong to the active branch.");
          }
        } else {
          const pMethod = String(data.paymentMethod).toUpperCase();
          const notesLower = (data.notes || "").toLowerCase();
          if (pMethod === "BKASH" || pMethod === "MOBILE" && notesLower.includes("bkash")) {
            financialAccount = await tx.financialAccount.findFirst({
              where: {
                tenantId,
                branchId: data.branchId,
                isActive: true,
                OR: [
                  { type: "BKASH" },
                  { name: { contains: "bkash", mode: "insensitive" } }
                ]
              }
            });
          } else if (pMethod === "NAGAD" || pMethod === "MOBILE" && notesLower.includes("nagad")) {
            financialAccount = await tx.financialAccount.findFirst({
              where: {
                tenantId,
                branchId: data.branchId,
                isActive: true,
                OR: [
                  { type: "NAGAD" },
                  { name: { contains: "nagad", mode: "insensitive" } }
                ]
              }
            });
          } else if (pMethod === "BANK" || pMethod === "CARD") {
            if (data.bankName) {
              financialAccount = await tx.financialAccount.findFirst({
                where: {
                  tenantId,
                  branchId: data.branchId,
                  type: "BANK",
                  isActive: true,
                  OR: [
                    { name: { contains: data.bankName, mode: "insensitive" } },
                    { bankName: { contains: data.bankName, mode: "insensitive" } }
                  ]
                }
              });
            }
            if (!financialAccount) {
              financialAccount = await tx.financialAccount.findFirst({
                where: {
                  tenantId,
                  branchId: data.branchId,
                  type: "BANK",
                  isActive: true
                },
                orderBy: { isDefault: "desc" }
              });
            }
          }
          if (!financialAccount) {
            financialAccount = await tx.financialAccount.findFirst({
              where: {
                tenantId,
                branchId: data.branchId,
                type: "CASH",
                isActive: true
              },
              orderBy: { isDefault: "desc" }
            });
          }
          if (!financialAccount) {
            financialAccount = await tx.financialAccount.findFirst({
              where: { tenantId, branchId: data.branchId, isActive: true }
            });
          }
        }
        if (!financialAccount) {
          throw new Error("No active financial account exists for this branch. Please create a financial account for this branch in Accounts & Finance first.");
        }
        await tx.financialAccount.update({
          where: { id: financialAccount.id },
          data: { balance: { increment: actualPaid } }
        });
        await tx.sale.update({
          where: { id: createdSale.id },
          data: { financialAccountId: financialAccount.id }
        });
        await tx.financialTransaction.create({
          data: {
            tenantId,
            branchId: data.branchId,
            destinationAccountId: financialAccount.id,
            amount: actualPaid,
            type: "SALE_PAYMENT",
            reference: receiptNo,
            note: `POS Sale Receipt #${receiptNo} via ${financialAccount.name}${data.transactionRef ? ` (Ref: ${data.transactionRef})` : ""}`,
            userId
          }
        });
      }
      return createdSale;
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "POS_SALE_COMPLETED",
      details: {
        saleId: sale.id,
        receiptNo,
        totalAmount,
        itemCount: preparedSaleItems.length,
        customerName: sale.customerName
      }
    });
    return sale;
  }
  /**
   * List Sales with Search, Customer, Date Range, Status Filters & Pagination
   */
  static async listSales(tenantId, query, userRole, userBranchId) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { receiptNo: { contains: query.search, mode: "insensitive" } },
        { customerName: { contains: query.search, mode: "insensitive" } },
        { customerPhone: { contains: query.search, mode: "insensitive" } }
      ];
    }
    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, location: true } },
          user: { select: { id: true, name: true, username: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true, size: true } }
            }
          }
        }
      })
    ]);
    return {
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Get Distinct Recent Customers with Phone, Name, Address
   */
  static async getCustomers(tenantId, search) {
    const where = {
      tenantId,
      customerPhone: { not: null }
    };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerPhone: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } }
      ];
    }
    const sales = await prisma.sale.findMany({
      where,
      select: {
        customerPhone: true,
        customerName: true,
        customerEmail: true,
        notes: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    const customerMap = /* @__PURE__ */ new Map();
    for (const s of sales) {
      const phone = s.customerPhone?.trim();
      if (!phone || customerMap.has(phone)) continue;
      let address = "";
      if (s.notes) {
        const match = s.notes.match(/address:\s*([^\n\r|]+)/i);
        if (match && match[1]) {
          address = match[1].trim();
        } else if (!s.notes.includes(":") && s.notes.length < 120 && !s.notes.toLowerCase().includes("via")) {
          address = s.notes.trim();
        }
      }
      customerMap.set(phone, {
        phone,
        name: s.customerName?.trim() || "Customer",
        email: s.customerEmail?.trim() || void 0,
        address: address || void 0
      });
    }
    return Array.from(customerMap.values());
  }
  /**
   * Get Single Sale with Itemized Batches
   */
  static async getSaleById(saleId, tenantId) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        branch: true,
        user: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            product: true
          }
        }
      }
    });
    if (!sale) {
      throw new Error("Sale record not found");
    }
    return sale;
  }
  /**
   * Get Printable / PDF-Ready Receipt Data
   */
  static async getReceiptData(saleId, tenantId) {
    const [sale, tenant] = await Promise.all([
      prisma.sale.findFirst({
        where: { id: saleId, tenantId },
        include: {
          branch: true,
          user: { select: { id: true, name: true, username: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true, size: true, brandName: true } }
            }
          }
        }
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, email: true, address: true, logoUrl: true }
      })
    ]);
    if (!sale) {
      throw new Error("Sale not found");
    }
    return {
      pharmacy: {
        name: tenant?.name || "Pharmacy Chain",
        address: sale.branch.location || tenant?.address || "Main Branch",
        phone: sale.branch.phone || tenant?.phone || "\u2014",
        email: sale.branch.email || tenant?.email || "\u2014",
        logoUrl: tenant?.logoUrl || null
      },
      invoice: {
        id: sale.id,
        receiptNo: sale.receiptNo,
        date: sale.createdAt,
        cashier: sale.user.name || sale.user.username,
        branch: sale.branch.name,
        customerName: sale.customerName || "Walk-in Customer",
        customerPhone: sale.customerPhone || "\u2014",
        customerEmail: sale.customerEmail || "\u2014",
        paymentMethod: sale.paymentMethod,
        subTotal: Number(sale.subTotal),
        discount: Number(sale.discount),
        discountType: sale.discountType,
        tax: Number(sale.tax),
        totalAmount: Number(sale.totalAmount),
        paidAmount: Number(sale.paidAmount),
        dueAmount: Number(sale.dueAmount),
        changeAmount: Number(sale.changeAmount),
        status: sale.status,
        notes: sale.notes,
        items: sale.items.map((item) => ({
          name: item.product.name,
          brandName: item.product.brandName || "\u2014",
          size: item.product.size || "\u2014",
          sku: item.product.sku,
          batchNumber: item.batchNumber || "\u2014",
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "\u2014",
          unitType: item.unitType || "PIECE",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subTotal: Number(item.subTotal)
        }))
      }
    };
  }
  /**
   * Refund Sale & Return Stock to Batches
   */
  static async refundSale(saleId, tenantId, userId, userRole, data) {
    if (!["COMPANY_OWNER", "BRANCH_MANAGER"].includes(userRole)) {
      throw new Error("Only a Company Owner or Branch Manager can authorize a refund");
    }
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true, branch: true }
    });
    if (!sale) throw new Error("Sale not found");
    if (sale.status === "REFUNDED") throw new Error("Sale has already been refunded");
    if (sale.status === "VOIDED") throw new Error("Cannot refund a voided sale");
    const refunded = await prisma.$transaction(async (tx) => {
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "REFUNDED",
          refundReason: data.reason,
          managerApprovedBy: data.managerId
        }
      });
      for (const item of sale.items) {
        const qtyToReturn = item.lowestUnitQuantity || item.quantity;
        if (item.inventoryId) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { quantity: { increment: qtyToReturn } }
          });
        }
        await tx.stockMovement.create({
          data: {
            branchId: sale.branchId,
            productId: item.productId,
            inventoryId: item.inventoryId || null,
            type: "RETURN",
            quantity: qtyToReturn,
            reason: `Refund for receipt #${sale.receiptNo}: ${data.reason}`,
            performedBy: userId,
            referenceId: sale.id
          }
        });
      }
      const refundAmount = Number(sale.paidAmount || sale.totalAmount);
      if (refundAmount > 0) {
        const accountType = sale.paymentMethod === "CARD" ? "CARD_SETTLEMENT" : sale.paymentMethod === "MOBILE" ? "MOBILE" : "CASH";
        const financialAccount = await tx.financialAccount.findFirst({
          where: { tenantId, branchId: sale.branchId, type: accountType, isActive: true }
        });
        if (financialAccount) {
          await tx.financialAccount.update({
            where: { id: financialAccount.id },
            data: { balance: { decrement: refundAmount } }
          });
          await tx.financialTransaction.create({
            data: {
              tenantId,
              branchId: sale.branchId,
              sourceAccountId: financialAccount.id,
              amount: refundAmount,
              type: "REFUND",
              reference: `REFUND-${sale.receiptNo}`,
              note: `Refund for POS Receipt #${sale.receiptNo}: ${data.reason}`,
              userId
            }
          });
        }
      }
      return updatedSale;
    });
    await AuditService.log({
      tenantId,
      branchId: sale.branchId,
      userId,
      action: "POS_SALE_REFUNDED",
      details: { saleId, receiptNo: sale.receiptNo, reason: data.reason }
    });
    return refunded;
  }
  /**
   * Void Sale & Return Stock
   */
  static async voidSale(saleId, tenantId, userId, userRole, data) {
    if (!["COMPANY_OWNER", "BRANCH_MANAGER"].includes(userRole)) {
      throw new Error("Only a Company Owner or Branch Manager can void a sale");
    }
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true, branch: true }
    });
    if (!sale) throw new Error("Sale not found");
    if (sale.status !== "COMPLETED") throw new Error(`Cannot void a sale with status "${sale.status}"`);
    const voided = await prisma.$transaction(async (tx) => {
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "VOIDED",
          voidReason: data.reason,
          managerApprovedBy: data.managerId
        }
      });
      for (const item of sale.items) {
        const qtyToReturn = item.lowestUnitQuantity || item.quantity;
        if (item.inventoryId) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { quantity: { increment: qtyToReturn } }
          });
        }
        await tx.stockMovement.create({
          data: {
            branchId: sale.branchId,
            productId: item.productId,
            inventoryId: item.inventoryId || null,
            type: "ADJUSTMENT",
            quantity: qtyToReturn,
            reason: `Void of receipt #${sale.receiptNo}: ${data.reason}`,
            performedBy: userId,
            referenceId: sale.id
          }
        });
      }
      return updatedSale;
    });
    await AuditService.log({
      tenantId,
      branchId: sale.branchId,
      userId,
      action: "POS_SALE_VOIDED",
      details: { saleId, receiptNo: sale.receiptNo, reason: data.reason }
    });
    return voided;
  }
};

// src/modules/sales/sales.controller.ts
var SalesController = class {
  static async createSale(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const user = req.user;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      if (!isOwner && user.branchId && req.body.branchId && req.body.branchId !== user.branchId) {
        res.status(403).json({ success: false, message: "Forbidden: You can only ring up sales in your assigned branch." });
        return;
      }
      if (!isOwner && user.branchId && !req.body.branchId) {
        req.body.branchId = user.branchId;
      }
      const sale = await SalesService.createSale(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Sale processed successfully",
        data: sale
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listSales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = { ...req.query };
      if (!query.branchId && req.headers["x-branch-id"]) {
        const headerBranch = req.headers["x-branch-id"].trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          query.branchId = headerBranch;
        }
      }
      const result = await SalesService.listSales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getCustomers(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const search = req.query.search;
      const customers = await SalesService.getCustomers(tenantId, search);
      res.status(200).json({ success: true, data: customers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getSaleById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const sale = await SalesService.getSaleById(id, tenantId);
      res.status(200).json({ success: true, data: sale });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async getReceipt(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const receipt = await SalesService.getReceiptData(id, tenantId);
      res.status(200).json({ success: true, data: receipt });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async refundSale(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const userRole = req.user.role;
      const refunded = await SalesService.refundSale(id, tenantId, userId, userRole, req.body);
      res.status(200).json({
        success: true,
        message: "Sale refunded and stock returned to inventory successfully",
        data: refunded
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async voidSale(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const userRole = req.user.role;
      const voided = await SalesService.voidSale(id, tenantId, userId, userRole, req.body);
      res.status(200).json({
        success: true,
        message: "Sale voided and stock returned to inventory successfully",
        data: voided
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/modules/sales/sales.validation.ts
import { z as z11 } from "zod";
var saleItemInputSchema = z11.object({
  productId: z11.string().min(1, "Product ID is required"),
  inventoryId: z11.string().optional().nullable(),
  inventoryLocationId: z11.string().optional().nullable(),
  batchNumber: z11.string().optional().nullable(),
  unitType: z11.string().default("PIECE"),
  // e.g. "TABLET", "STRIP", "BOX", "BOTTLE", "PIECE"
  unitMultiplier: z11.number().int().positive().default(1),
  quantity: z11.number().int().positive("Quantity must be greater than 0"),
  unitPrice: z11.number().nonnegative("Unit price must be positive").optional()
});
var createSaleSchema = z11.object({
  branchId: z11.string().min(1, "Branch ID is required"),
  items: z11.array(saleItemInputSchema).min(1, "Must contain at least one item"),
  customerName: z11.string().optional().nullable(),
  customerPhone: z11.string().optional().nullable(),
  customerEmail: z11.string().optional().nullable(),
  paymentMethod: z11.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).default("CASH"),
  financialAccountId: z11.string().optional().nullable(),
  bankName: z11.string().optional().nullable(),
  transactionRef: z11.string().optional().nullable(),
  discount: z11.number().nonnegative().default(0),
  discountType: z11.enum(["FIXED", "PERCENT"]).default("FIXED"),
  tax: z11.number().nonnegative().default(0),
  paidAmount: z11.number().nonnegative().optional(),
  notes: z11.string().optional().nullable(),
  prescriptionRef: z11.string().optional().nullable(),
  managerApprovedBy: z11.string().optional().nullable(),
  localCreatedAt: z11.string().optional()
});
var refundSaleSchema = z11.object({
  reason: z11.string().min(1, "Refund reason is required"),
  managerId: z11.string().min(1, "Manager authorization is required")
});
var voidSaleSchema = z11.object({
  reason: z11.string().min(1, "Void reason is required"),
  managerId: z11.string().min(1, "Manager authorization is required")
});
var listSalesQuerySchema = z11.object({
  page: z11.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z11.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  branchId: z11.string().optional(),
  userId: z11.string().optional(),
  status: z11.enum(["COMPLETED", "REFUNDED", "VOIDED"]).optional(),
  paymentMethod: z11.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).optional(),
  financialAccountId: z11.string().optional(),
  startDate: z11.string().optional(),
  endDate: z11.string().optional(),
  search: z11.string().optional()
});

// src/modules/sales/sales.routes.ts
var router11 = Router11();
router11.use(authenticate, requireActiveSubscription);
router11.post(
  "/",
  requirePermission("pos.manage"),
  validateRequest({ body: createSaleSchema }),
  SalesController.createSale
);
router11.get(
  "/",
  requirePermission("pos.history"),
  validateRequest({ query: listSalesQuerySchema }),
  SalesController.listSales
);
router11.get("/customers", requirePermission("pos.manage"), SalesController.getCustomers);
router11.get("/:id", requirePermission("pos.history"), SalesController.getSaleById);
router11.get("/:id/receipt", requirePermission("pos.history"), SalesController.getReceipt);
router11.post(
  "/:id/refund",
  requirePermission("pos.manage"),
  validateRequest({ body: refundSaleSchema }),
  SalesController.refundSale
);
router11.post(
  "/:id/void",
  requirePermission("pos.manage"),
  validateRequest({ body: voidSaleSchema }),
  SalesController.voidSale
);

// src/modules/report/report.routes.ts
import { Router as Router12 } from "express";

// src/modules/report/report.service.ts
var ReportService = class {
  /**
   * Comprehensive Daily & Filterable Sales Report
   */
  /**
   * Helper to parse date string safely in local calendar bounds
   */
  static parseBoundaryDate(dateStr, isEnd = false) {
    if (!dateStr) {
      const now = /* @__PURE__ */ new Date();
      if (isEnd) return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      if (isEnd) return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    if (isEnd) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
  }
  /**
   * Comprehensive Daily & Filterable Sales Report
   */
  static async getDailySales(tenantId, query, userRole, userBranchId) {
    const startDate = this.parseBoundaryDate(query.startDate, false);
    const endDate = query.endDate ? this.parseBoundaryDate(query.endDate, true) : query.startDate ? this.parseBoundaryDate(query.startDate, true) : this.parseBoundaryDate(void 0, true);
    const where = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }
    const [sales, tenant, targetBranch] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, location: true, phone: true } },
          user: { select: { id: true, name: true, username: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  genericName: true,
                  unit: true,
                  size: true,
                  brandName: true,
                  categoryRef: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, phone: true, email: true, address: true, logoUrl: true }
      }),
      where.branchId ? prisma.branch.findUnique({
        where: { id: where.branchId },
        select: { id: true, name: true, location: true, phone: true, email: true }
      }) : null
    ]);
    let totalSubTotal = 0;
    let totalDiscounts = 0;
    let totalTaxes = 0;
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalCostOfGoods = 0;
    const paymentBreakdown = {
      cash: 0,
      bkash: 0,
      nagad: 0,
      card: 0,
      other: 0,
      grandTotal: 0
    };
    const productMap = /* @__PURE__ */ new Map();
    let totalUnitsSold = 0;
    const hourlyMap = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = { count: 0, revenue: 0 };
    sales.forEach((s) => {
      const saleSubTotal = Number(s.subTotal || 0);
      const saleDiscount = Number(s.discount || 0);
      const saleTax = Number(s.tax || 0);
      const saleTotal = Number(s.totalAmount || 0);
      const salePaid = Number(s.paidAmount !== void 0 ? s.paidAmount : saleTotal);
      const saleDue = Number(s.dueAmount || 0);
      totalSubTotal += saleSubTotal;
      totalDiscounts += saleDiscount;
      totalTaxes += saleTax;
      totalRevenue += saleTotal;
      totalPaid += salePaid;
      totalDue += saleDue;
      const method = String(s.paymentMethod || "").toUpperCase();
      const note = (s.notes || "").toLowerCase();
      paymentBreakdown.grandTotal += saleTotal;
      if (method === "CASH") {
        paymentBreakdown.cash += saleTotal;
      } else if (method === "BKASH") {
        paymentBreakdown.bkash += saleTotal;
      } else if (method === "NAGAD") {
        paymentBreakdown.nagad += saleTotal;
      } else if (method === "BANK" || method === "CARD") {
        paymentBreakdown.card += saleTotal;
      } else if (method === "MOBILE") {
        if (note.includes("nagad")) {
          paymentBreakdown.nagad += saleTotal;
        } else {
          paymentBreakdown.bkash += saleTotal;
        }
      } else {
        paymentBreakdown.other += saleTotal;
      }
      const hour = new Date(s.createdAt).getHours();
      hourlyMap[hour].count += 1;
      hourlyMap[hour].revenue += saleTotal;
      (s.items || []).forEach((item) => {
        const prod = item.product;
        const pId = item.productId;
        const qty = Number(item.quantity || 0);
        const lowestUnitQty = Number(item.lowestUnitQuantity || qty);
        const itemAmount = Number(item.subTotal || Number(item.unitPrice || 0) * qty);
        const itemCost = item.purchasePrice ? Number(item.purchasePrice) * lowestUnitQty : 0;
        totalUnitsSold += qty;
        totalCostOfGoods += itemCost;
        if (!productMap.has(pId)) {
          productMap.set(pId, {
            productId: pId,
            productName: prod?.name || "Unknown Product",
            sku: prod?.sku || "\u2014",
            genericName: prod?.genericName || null,
            category: prod?.categoryRef?.name || prod?.brandName || "General Medicine",
            unitType: item.unitType || prod?.unit || "Piece",
            quantitySold: 0,
            lowestUnitQuantitySold: 0,
            totalAmount: 0,
            totalCost: 0,
            averageUnitPrice: 0,
            transactionsCount: 0
          });
        }
        const entry = productMap.get(pId);
        entry.quantitySold += qty;
        entry.lowestUnitQuantitySold += lowestUnitQty;
        entry.totalAmount += itemAmount;
        entry.totalCost += itemCost;
        entry.transactionsCount += 1;
      });
    });
    const productSalesList = Array.from(productMap.values()).map((p) => ({
      ...p,
      totalAmount: Math.round(p.totalAmount * 100) / 100,
      totalCost: Math.round(p.totalCost * 100) / 100,
      grossProfit: Math.round((p.totalAmount - p.totalCost) * 100) / 100,
      averageUnitPrice: p.quantitySold > 0 ? Math.round(p.totalAmount / p.quantitySold * 100) / 100 : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);
    const transactionList = sales.map((s) => {
      const note = (s.notes || "").toLowerCase();
      let paymentDetail = s.paymentMethod;
      if (s.paymentMethod === "MOBILE") {
        paymentDetail = note.includes("nagad") ? "Nagad" : "bKash";
      } else if (s.paymentMethod === "CASH") {
        paymentDetail = "Cash";
      } else if (s.paymentMethod === "CARD") {
        paymentDetail = "Card / POS";
      }
      return {
        id: s.id,
        receiptNo: s.receiptNo,
        customerName: s.customerName || "Walk-in Customer",
        customerPhone: s.customerPhone || null,
        paymentMethod: s.paymentMethod,
        paymentDetail,
        subTotal: Number(s.subTotal),
        discount: Number(s.discount),
        tax: Number(s.tax),
        totalAmount: Number(s.totalAmount),
        paidAmount: Number(s.paidAmount),
        dueAmount: Number(s.dueAmount),
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt,
        cashier: s.user ? { name: s.user.name, username: s.user.username } : null,
        branch: s.branch ? { id: s.branch.id, name: s.branch.name } : null,
        itemsCount: (s.items || []).length,
        items: (s.items || []).map((i) => ({
          name: i.product?.name || "Product",
          quantity: i.quantity,
          unitType: i.unitType,
          unitPrice: Number(i.unitPrice),
          subTotal: Number(i.subTotal),
          batchNumber: i.batchNumber
        }))
      };
    });
    const totalTransactions = sales.length;
    return {
      period: "Daily",
      startDate,
      endDate,
      pharmacy: {
        name: tenant?.name || "Pharmacy Store",
        address: targetBranch?.location || tenant?.address || "Main Branch",
        phone: targetBranch?.phone || tenant?.phone || "\u2014",
        email: targetBranch?.email || tenant?.email || "\u2014",
        logoUrl: tenant?.logoUrl || null
      },
      branch: targetBranch,
      summary: {
        totalSales: Math.round(totalRevenue * 100) / 100,
        totalSubTotal: Math.round(totalSubTotal * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTaxes: Math.round(totalTaxes * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        transactionCount: totalTransactions,
        totalUnitsSold,
        totalCostOfGoods: Math.round(totalCostOfGoods * 100) / 100,
        grossProfit: Math.round((totalRevenue - totalCostOfGoods) * 100) / 100,
        averageOrderValue: totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions * 100) / 100 : 0
      },
      paymentBreakdown: {
        cash: Math.round(paymentBreakdown.cash * 100) / 100,
        bkash: Math.round(paymentBreakdown.bkash * 100) / 100,
        nagad: Math.round(paymentBreakdown.nagad * 100) / 100,
        card: Math.round(paymentBreakdown.card * 100) / 100,
        other: Math.round(paymentBreakdown.other * 100) / 100,
        grandTotal: Math.round(paymentBreakdown.grandTotal * 100) / 100
      },
      productSales: productSalesList,
      transactions: transactionList,
      hourlyBreakdown: hourlyMap
    };
  }
  /**
   * Weekly Sales Report (Last 7 Days)
   */
  static async getWeeklySales(tenantId, query, userRole, userBranchId) {
    const end = query.endDate ? new Date(query.endDate) : /* @__PURE__ */ new Date();
    const start = query.startDate ? new Date(query.startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const where = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
    const dayMap = {};
    sales.forEach((s) => {
      const dayKey = new Date(s.createdAt).toISOString().split("T")[0];
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { count: 0, revenue: 0 };
      }
      dayMap[dayKey].count += 1;
      dayMap[dayKey].revenue += Number(s.totalAmount);
    });
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    return {
      period: "Weekly",
      startDate: start,
      endDate: end,
      totalTransactions: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      dailyBreakdown: dayMap
    };
  }
  /**
   * Monthly Sales Report
   */
  static async getMonthlySales(tenantId, query, userRole, userBranchId) {
    const end = query.endDate ? new Date(query.endDate) : /* @__PURE__ */ new Date();
    const start = query.startDate ? new Date(query.startDate) : new Date(end.getFullYear(), end.getMonth(), 1);
    const where = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: start, lte: end }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    return {
      period: "Monthly",
      startDate: start,
      endDate: end,
      totalTransactions: sales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageDailyRevenue: Math.round(totalRevenue / 30 * 100) / 100
    };
  }
  /**
   * Branch-Wise Sales Comparison
   */
  static async getBranchWiseSales(tenantId, query) {
    const where = {
      tenantId,
      status: "COMPLETED"
    };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    const [branches, sales] = await Promise.all([
      prisma.branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, location: true }
      }),
      prisma.sale.findMany({
        where,
        select: { branchId: true, totalAmount: true, status: true }
      })
    ]);
    const branchStats = branches.map((b) => {
      const branchSales = sales.filter((s) => s.branchId === b.id);
      const totalRev = branchSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      return {
        branchId: b.id,
        branchName: b.name,
        location: b.location,
        transactions: branchSales.length,
        totalRevenue: Math.round(totalRev * 100) / 100
      };
    });
    return {
      branches: branchStats.sort((a, b) => b.totalRevenue - a.totalRevenue)
    };
  }
  /**
   * Region-Wise Sales Report (Growth+ Tier)
   */
  static async getRegionWiseSales(tenantId, query) {
    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      include: {
        sales: {
          where: {
            status: "COMPLETED",
            ...query.startDate || query.endDate ? {
              createdAt: {
                ...query.startDate && { gte: new Date(query.startDate) },
                ...query.endDate && { lte: new Date(query.endDate) }
              }
            } : {}
          }
        }
      }
    });
    const regionMap = {};
    branches.forEach((b) => {
      const region = b.location || "Default Region";
      if (!regionMap[region]) {
        regionMap[region] = { branchCount: 0, transactionCount: 0, revenue: 0 };
      }
      regionMap[region].branchCount += 1;
      regionMap[region].transactionCount += b.sales.length;
      regionMap[region].revenue += b.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    });
    return {
      regions: Object.entries(regionMap).map(([region, stats]) => ({
        region,
        branchCount: stats.branchCount,
        transactionCount: stats.transactionCount,
        totalRevenue: Math.round(stats.revenue * 100) / 100
      }))
    };
  }
  /**
   * Company-Wide Sales & Financial Metrics
   */
  static async getCompanyWideSales(tenantId, query) {
    const where = { tenantId };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    const sales = await prisma.sale.findMany({
      where
    });
    const completedSales = sales.filter((s) => s.status === "COMPLETED");
    const refundedSales = sales.filter((s) => s.status === "REFUNDED");
    const voidedSales = sales.filter((s) => s.status === "VOIDED");
    const grossRevenue = completedSales.reduce((sum, s) => sum + Number(s.subTotal), 0);
    const totalDiscounts = completedSales.reduce((sum, s) => sum + Number(s.discount), 0);
    const totalTaxes = completedSales.reduce((sum, s) => sum + Number(s.tax), 0);
    const netRevenue = completedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const refundedAmount = refundedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    return {
      summary: {
        totalOrders: sales.length,
        completedOrders: completedSales.length,
        refundedOrders: refundedSales.length,
        voidedOrders: voidedSales.length,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTaxes: Math.round(totalTaxes * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        refundedAmount: Math.round(refundedAmount * 100) / 100
      }
    };
  }
  /**
   * Inventory Valuation & Stock Report
   */
  static async getInventoryReport(tenantId, branchId, userRole, userBranchId) {
    const where = {
      product: { tenantId, isActive: true },
      branch: { tenantId, isActive: true }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole || "") && userBranchId) {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }
    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        branch: { select: { id: true, name: true } }
      }
    });
    let totalStockUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let expiredCount = 0;
    const now = /* @__PURE__ */ new Date();
    inventories.forEach((inv) => {
      totalStockUnits += inv.quantity;
      totalValuation += inv.quantity * Number(inv.product.basePrice);
      if (inv.quantity <= (inv.lowStockThreshold || 5)) lowStockCount += 1;
      if (inv.expiryDate && new Date(inv.expiryDate) < now) expiredCount += 1;
    });
    return {
      totalSKUs: inventories.length,
      totalStockUnits,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockSKUs: lowStockCount,
      expiredSKUs: expiredCount
    };
  }
  /**
   * VAT / MIS Compliance Report
   */
  static async getVatMisReport(tenantId, query) {
    const where = {
      tenantId,
      status: "COMPLETED"
    };
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    let taxableSales = 0;
    let totalVatCollected = 0;
    let controlledSalesCount = 0;
    let prescriptionSalesCount = 0;
    sales.forEach((s) => {
      totalVatCollected += Number(s.tax);
      if (Number(s.tax) > 0) {
        taxableSales += Number(s.subTotal);
      }
      if (s.managerApprovedBy) controlledSalesCount += 1;
      if (s.prescriptionRef) prescriptionSalesCount += 1;
    });
    return {
      reportType: "VAT & MIS Compliance",
      generatedAt: /* @__PURE__ */ new Date(),
      totalTransactions: sales.length,
      taxableSalesAmount: Math.round(taxableSales * 100) / 100,
      totalVatCollected: Math.round(totalVatCollected * 100) / 100,
      controlledSubstanceSales: controlledSalesCount,
      prescriptionSales: prescriptionSalesCount
    };
  }
  /**
   * Comprehensive Owner/Manager Dashboard Analytics
   * Supports: Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range, and All-Time.
   * Scoped to assigned branch for Branch Managers, or company-wide / selectable for Pharmacy Owner.
   */
  static async getDashboardMetrics(tenantId, branchId, userRole, userBranchId, userId, period, startDate, endDate) {
    const isBranchRestricted = ["BRANCH_MANAGER", "MANAGER", "CASHIER", "INVENTORY_EXECUTIVE"].includes(userRole || "");
    let effectiveBranchId = void 0;
    if (isBranchRestricted) {
      if (userBranchId) {
        effectiveBranchId = userBranchId;
      } else if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { branchId: true }
        });
        if (dbUser?.branchId) {
          effectiveBranchId = dbUser.branchId;
        }
      }
    } else {
      effectiveBranchId = branchId && branchId !== "all" ? branchId : void 0;
    }
    const now = /* @__PURE__ */ new Date();
    let rangeStart;
    let rangeEnd;
    const activePeriod = period || (startDate || endDate ? "custom" : "30d");
    if (activePeriod === "today") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (activePeriod === "yesterday") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (activePeriod === "7d") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (activePeriod === "30d") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (activePeriod === "custom") {
      if (startDate) {
        rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);
      }
    }
    const saleWhere = {
      tenantId,
      status: "COMPLETED"
    };
    if (effectiveBranchId) saleWhere.branchId = effectiveBranchId;
    if (rangeStart || rangeEnd) {
      saleWhere.createdAt = {};
      if (rangeStart) saleWhere.createdAt.gte = rangeStart;
      if (rangeEnd) saleWhere.createdAt.lte = rangeEnd;
    }
    const inventoryWhere = {
      branch: { tenantId }
    };
    if (effectiveBranchId) inventoryWhere.branchId = effectiveBranchId;
    const transferLossWhere = {
      product: { tenantId },
      OR: [
        { damagedQuantity: { gt: 0 } },
        { missingQuantity: { gt: 0 } }
      ]
    };
    const transferDateFilter = rangeStart || rangeEnd ? {
      createdAt: {
        ...rangeStart ? { gte: rangeStart } : {},
        ...rangeEnd ? { lte: rangeEnd } : {}
      }
    } : {};
    if (effectiveBranchId) {
      transferLossWhere.transfer = {
        OR: [
          { toBranchId: effectiveBranchId },
          { fromBranchId: effectiveBranchId }
        ],
        ...transferDateFilter
      };
    } else if (rangeStart || rangeEnd) {
      transferLossWhere.transfer = transferDateFilter;
    }
    const ninetyDaysFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1e3);
    const [sales, inventories, accounts, suppliers, allBranches, transferLossItems, directDamageMovements] = await Promise.all([
      prisma.sale.findMany({
        where: saleWhere,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  categoryId: true,
                  categoryRef: { select: { name: true } },
                  basePrice: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      }),
      prisma.inventory.findMany({
        where: inventoryWhere,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              categoryId: true,
              categoryRef: { select: { name: true } },
              basePrice: true
            }
          },
          branch: { select: { id: true, name: true, location: true } }
        }
      }),
      prisma.financialAccount.findMany({
        where: { tenantId, isActive: true, ...effectiveBranchId ? { branchId: effectiveBranchId } : {} }
      }),
      prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        select: { totalDue: true }
      }),
      prisma.branch.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, location: true }
      }),
      prisma.transferItem.findMany({
        where: transferLossWhere,
        include: {
          transfer: {
            select: {
              id: true,
              fromBranchId: true,
              toBranchId: true,
              transferDate: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.stockMovement.findMany({
        where: {
          type: "DAMAGE",
          // Scope to tenant's branches to prevent cross-tenant leakage
          ...effectiveBranchId ? { branchId: effectiveBranchId } : { inventory: { branch: { tenantId } } },
          ...rangeStart || rangeEnd ? {
            createdAt: {
              ...rangeStart ? { gte: rangeStart } : {},
              ...rangeEnd ? { lte: rangeEnd } : {}
            }
          } : {}
        }
      }).catch(() => [])
    ]);
    const activeBranch = effectiveBranchId ? allBranches.find((b) => b.id === effectiveBranchId) : null;
    let totalSalesRevenue = 0;
    let totalCostOfSold = 0;
    const paymentBreakdown = {
      CASH: 0,
      BKASH: 0,
      NAGAD: 0,
      CARD: 0,
      OTHER: 0
    };
    const categoryMap = {};
    const productSalesMap = {};
    const dynamicTrendMap = {};
    if (activePeriod === "today" || activePeriod === "yesterday") {
      for (let h = 0; h < 24; h++) {
        const hourStr = String(h).padStart(2, "0");
        const hourLabel = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        dynamicTrendMap[hourStr] = { key: hourStr, label: hourLabel, sales: 0, revenue: 0, profit: 0 };
      }
    } else if (activePeriod === "7d") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, profit: 0 };
      }
    } else if (activePeriod === "30d") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
        dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, profit: 0 };
      }
    } else if (activePeriod === "custom" && rangeStart && rangeEnd) {
      const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1e3 * 60 * 60 * 24));
      if (diffDays <= 2) {
        for (let h = 0; h < 24; h++) {
          const hourStr = String(h).padStart(2, "0");
          const hourLabel = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
          dynamicTrendMap[hourStr] = { key: hourStr, label: hourLabel, sales: 0, revenue: 0, profit: 0 };
        }
      } else {
        const stepDays = Math.min(diffDays, 60);
        for (let i = stepDays; i >= 0; i--) {
          const d = new Date(rangeEnd.getTime() - i * 24 * 60 * 60 * 1e3);
          if (d >= rangeStart) {
            const dateStr = d.toISOString().split("T")[0];
            const label = `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
            dynamicTrendMap[dateStr] = { key: dateStr, label, sales: 0, revenue: 0, profit: 0 };
          }
        }
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        dynamicTrendMap[key] = { key, label, sales: 0, revenue: 0, profit: 0 };
      }
    }
    const branchStatsMap = {};
    allBranches.forEach((b) => {
      branchStatsMap[b.id] = {
        branchId: b.id,
        branchName: b.name,
        location: b.location || "Default",
        stockUnits: 0,
        inventoryValue: 0,
        salesRevenue: 0,
        ordersCount: 0,
        costOfSold: 0,
        grossProfit: 0,
        damagedMissingLoss: 0,
        netProfit: 0
      };
    });
    sales.forEach((s) => {
      const saleAmount = Number(s.totalAmount || 0);
      totalSalesRevenue += saleAmount;
      if (s.branchId && branchStatsMap[s.branchId]) {
        branchStatsMap[s.branchId].salesRevenue += saleAmount;
        branchStatsMap[s.branchId].ordersCount += 1;
      }
      const rawMethod = String(s.paymentMethod || "CASH").toUpperCase();
      if (rawMethod === "CASH") paymentBreakdown.CASH += saleAmount;
      else if (rawMethod === "BKASH") paymentBreakdown.BKASH += saleAmount;
      else if (rawMethod === "NAGAD") paymentBreakdown.NAGAD += saleAmount;
      else if (rawMethod === "CARD" || rawMethod === "POS") paymentBreakdown.CARD += saleAmount;
      else if (rawMethod === "MOBILE") paymentBreakdown.BKASH += saleAmount;
      else paymentBreakdown.OTHER += saleAmount;
      let saleCost = 0;
      (s.items || []).forEach((item) => {
        const itemSub = Number(item.subTotal || item.totalPrice || 0);
        const itemQty = Number(item.quantity || 0);
        const baseUnits = Number(item.lowestUnitQuantity || itemQty * Number(item.unitMultiplier || 1));
        const purchaseP = Number(item.purchasePrice ?? (item.product?.basePrice ?? 0));
        saleCost += purchaseP * baseUnits;
        const catName = item.product?.categoryRef?.name || (typeof item.product?.category === "string" ? item.product.category : null) || "Medicine";
        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, revenue: 0, count: 0 };
        }
        categoryMap[catName].revenue += itemSub;
        categoryMap[catName].count += itemQty;
        const pId = item.productId || (item.product?.id || `prod_${item.id}`);
        const pName = item.product?.name || "Product";
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { id: pId, name: pName, quantity: 0, revenue: 0 };
        }
        productSalesMap[pId].quantity += itemQty;
        productSalesMap[pId].revenue += itemSub;
      });
      totalCostOfSold += saleCost;
      if (s.branchId && branchStatsMap[s.branchId]) {
        branchStatsMap[s.branchId].costOfSold += saleCost;
      }
      const saleDate = new Date(s.createdAt);
      const profit = Math.max(0, saleAmount - saleCost);
      if (activePeriod === "today" || activePeriod === "yesterday" || activePeriod === "custom" && Object.keys(dynamicTrendMap).length === 24) {
        const hourStr = String(saleDate.getHours()).padStart(2, "0");
        if (dynamicTrendMap[hourStr]) {
          dynamicTrendMap[hourStr].sales += 1;
          dynamicTrendMap[hourStr].revenue += saleAmount;
          dynamicTrendMap[hourStr].profit += profit;
        }
      } else if (activePeriod === "all") {
        const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
        if (dynamicTrendMap[monthKey]) {
          dynamicTrendMap[monthKey].sales += 1;
          dynamicTrendMap[monthKey].revenue += saleAmount;
          dynamicTrendMap[monthKey].profit += profit;
        }
      } else {
        const dateKey = saleDate.toISOString().split("T")[0];
        if (dynamicTrendMap[dateKey]) {
          dynamicTrendMap[dateKey].sales += 1;
          dynamicTrendMap[dateKey].revenue += saleAmount;
          dynamicTrendMap[dateKey].profit += profit;
        }
      }
    });
    let totalStockUnits = 0;
    let totalInventoryCostValue = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;
    let expiredCount = 0;
    const lowStockItems = [];
    const nearExpiryItems = [];
    const stockCategoryMap = {};
    inventories.forEach((inv) => {
      const qty = Number(inv.quantity || 0);
      totalStockUnits += qty;
      const unitVal = Number(inv.purchasePrice ?? inv.product?.basePrice ?? 0);
      const lineVal = qty * unitVal;
      totalInventoryCostValue += lineVal;
      const catName = inv.product?.categoryRef?.name || (typeof inv.product?.category === "string" ? inv.product.category : null) || "General Medicine";
      if (!stockCategoryMap[catName]) {
        stockCategoryMap[catName] = { categoryName: catName, stockUnits: 0, stockValue: 0, itemCount: 0 };
      }
      stockCategoryMap[catName].stockUnits += qty;
      stockCategoryMap[catName].stockValue += lineVal;
      stockCategoryMap[catName].itemCount += 1;
      if (inv.branchId && branchStatsMap[inv.branchId]) {
        branchStatsMap[inv.branchId].stockUnits += qty;
        branchStatsMap[inv.branchId].inventoryValue += lineVal;
      }
      const threshold = inv.lowStockThreshold || 10;
      if (qty <= threshold) {
        lowStockCount += 1;
        if (lowStockItems.length < 5) {
          lowStockItems.push({
            id: inv.id,
            productName: inv.product?.name || "Product",
            batchNumber: inv.batchNumber || "BATCH-01",
            quantity: qty,
            threshold,
            rackLocation: inv.shelfLocation || "Shelf A"
          });
        }
      }
      if (inv.expiryDate) {
        const expDate = new Date(inv.expiryDate);
        if (expDate < now) {
          expiredCount += 1;
        } else if (expDate <= ninetyDaysFuture) {
          nearExpiryCount += 1;
          if (nearExpiryItems.length < 5) {
            nearExpiryItems.push({
              id: inv.id,
              productName: inv.product?.name || "Product",
              batchNumber: inv.batchNumber || "BATCH-01",
              expiryDate: inv.expiryDate,
              quantity: qty,
              rackLocation: inv.shelfLocation || "Shelf A"
            });
          }
        }
      }
    });
    const totalInvUnitsForPct = totalStockUnits || 1;
    const stockByCategory = Object.values(stockCategoryMap).map((c) => ({
      ...c,
      stockValue: Math.round(c.stockValue * 100) / 100,
      percentage: Math.round(c.stockUnits / totalInvUnitsForPct * 1e3) / 10
    })).sort((a, b) => b.stockUnits - a.stockUnits);
    let totalDamagedMissingLoss = 0;
    let damagedMissingUnitsCount = 0;
    transferLossItems.forEach((item) => {
      const lineLoss = Number(item.damagedValue || 0) + Number(item.missingValue || 0);
      const lineUnits = Number(item.damagedQuantity || 0) + Number(item.missingQuantity || 0);
      totalDamagedMissingLoss += lineLoss;
      damagedMissingUnitsCount += lineUnits;
      const targetBranchId = item.transfer?.toBranchId || item.transfer?.fromBranchId;
      if (targetBranchId && branchStatsMap[targetBranchId]) {
        branchStatsMap[targetBranchId].damagedMissingLoss += lineLoss;
      }
    });
    directDamageMovements.forEach((mov) => {
      const lineLoss = Math.abs(Number(mov.quantity || 0)) * Number(mov.unitPrice || 0);
      totalDamagedMissingLoss += lineLoss;
      damagedMissingUnitsCount += Math.abs(Number(mov.quantity || 0));
      if (mov.branchId && branchStatsMap[mov.branchId]) {
        branchStatsMap[mov.branchId].damagedMissingLoss += lineLoss;
      }
    });
    const totalGrossProfit = Math.max(0, totalSalesRevenue - totalCostOfSold);
    const netProfitAfterLoss = Math.round((totalGrossProfit - totalDamagedMissingLoss) * 100) / 100;
    const grossMargin = totalSalesRevenue > 0 ? Math.round(totalGrossProfit / totalSalesRevenue * 1e3) / 10 : 0;
    const netMargin = totalSalesRevenue > 0 ? Math.round(netProfitAfterLoss / totalSalesRevenue * 1e3) / 10 : 0;
    const branchWiseList = Object.values(branchStatsMap).map((b) => {
      const gross = Math.max(0, b.salesRevenue - b.costOfSold);
      const net = Math.round((gross - b.damagedMissingLoss) * 100) / 100;
      const margin = b.salesRevenue > 0 ? Math.round(gross / b.salesRevenue * 1e3) / 10 : 0;
      return {
        ...b,
        inventoryValue: Math.round(b.inventoryValue * 100) / 100,
        salesRevenue: Math.round(b.salesRevenue * 100) / 100,
        costOfSold: Math.round(b.costOfSold * 100) / 100,
        grossProfit: Math.round(gross * 100) / 100,
        damagedMissingLoss: Math.round(b.damagedMissingLoss * 100) / 100,
        netProfit: net,
        profitMargin: margin
      };
    });
    let cashBalance = 0;
    let bankBalance = 0;
    let digitalWalletBalance = 0;
    accounts.forEach((acc) => {
      const bal = Number(acc.balance || 0);
      if (acc.type === "CASH") cashBalance += bal;
      else if (acc.type === "BANK" || acc.type === "CARD_SETTLEMENT") bankBalance += bal;
      else if (acc.type === "MOBILE") digitalWalletBalance += bal;
    });
    const totalSupplierDues = suppliers.reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
    const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const categoryDistribution = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
    return {
      summary: {
        activePeriod,
        dateRange: {
          startDate: rangeStart ? rangeStart.toISOString() : null,
          endDate: rangeEnd ? rangeEnd.toISOString() : null
        },
        effectiveBranchId: effectiveBranchId || null,
        branchName: activeBranch ? activeBranch.name : "All Branches (Company-Wide)",
        isBranchRestricted,
        // 1. Current Live Inventory & Purchase Cost Valuation
        totalStockUnits,
        totalStockCostValue: Math.round(totalInventoryCostValue * 100) / 100,
        totalInventoryValue: Math.round(totalInventoryCostValue * 100) / 100,
        totalPurchaseCostValue: Math.round(totalInventoryCostValue * 100) / 100,
        // 2. Sales Revenue in Period
        totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
        totalRevenue: Math.round(totalSalesRevenue * 100) / 100,
        totalSalesCount: sales.length,
        totalTransactions: sales.length,
        // 3. Cost of Sold Products (COGS) in Period
        totalCostOfSold: Math.round(totalCostOfSold * 100) / 100,
        // 4. Gross Profit in Period
        totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
        totalProfit: Math.round(totalGrossProfit * 100) / 100,
        grossMargin,
        // 5. Damaged & Missing Stock Loss in Period
        totalDamagedMissingLoss: Math.round(totalDamagedMissingLoss * 100) / 100,
        damagedMissingUnitsCount,
        // 6. Net Realized Profit After Loss
        netProfitAfterLoss,
        netMargin,
        // Alerts & Stock Counts
        lowStockCount,
        nearExpiryCount,
        expiredCount,
        // Financial Liquidity
        supplierDues: Math.round(totalSupplierDues * 100) / 100,
        cashBalance: Math.round(cashBalance * 100) / 100,
        bankBalance: Math.round(bankBalance * 100) / 100,
        digitalWalletBalance: Math.round(digitalWalletBalance * 100) / 100
      },
      branchWisePerformance: branchWiseList,
      charts: {
        dailySalesTrend: Object.values(dynamicTrendMap),
        paymentBreakdown,
        categoryDistribution,
        stockByCategory,
        topSellingProducts
      },
      alerts: {
        lowStockItems,
        nearExpiryItems
      }
    };
  }
};

// src/modules/report/report.controller.ts
var ReportController = class {
  static async getDailySales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const report = await ReportService.getDailySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getWeeklySales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const report = await ReportService.getWeeklySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getMonthlySales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const report = await ReportService.getMonthlySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getBranchWiseSales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const report = await ReportService.getBranchWiseSales(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getRegionWiseSales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const report = await ReportService.getRegionWiseSales(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getCompanyWideSales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const report = await ReportService.getCompanyWideSales(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getInventoryReport(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const branchId = req.query.branchId;
      const report = await ReportService.getInventoryReport(tenantId, branchId, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getVatMisReport(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const report = await ReportService.getVatMisReport(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getDashboardMetrics(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const userId = req.user.id;
      const branchId = req.query.branchId;
      const period = req.query.period;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      const dashboard = await ReportService.getDashboardMetrics(
        tenantId,
        branchId,
        userRole,
        userBranchId,
        userId,
        period,
        startDate,
        endDate
      );
      res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/modules/report/report.validation.ts
import { z as z12 } from "zod";
var reportDateRangeSchema = z12.object({
  branchId: z12.string().optional().transform((v) => v === "" || v === "null" || v === "undefined" || v === "all" ? void 0 : v),
  userId: z12.string().optional().transform((v) => v === "" || v === "null" || v === "undefined" || v === "all" ? void 0 : v),
  paymentMethod: z12.enum(["CASH", "CARD", "MOBILE", "ALL"]).optional().transform((v) => v === "ALL" ? void 0 : v),
  startDate: z12.string().optional(),
  endDate: z12.string().optional()
});
var vatMisReportSchema = z12.object({
  branchId: z12.string().uuid().optional(),
  month: z12.string().optional(),
  // YYYY-MM
  year: z12.string().optional().transform((v) => v ? parseInt(v, 10) : (/* @__PURE__ */ new Date()).getFullYear()),
  startDate: z12.string().optional(),
  endDate: z12.string().optional()
});
var dashboardQuerySchema = z12.object({
  branchId: z12.string().optional().transform((v) => v === "" || v === "null" || v === "undefined" || v === "all" ? void 0 : v),
  period: z12.enum(["today", "yesterday", "7d", "30d", "custom", "all"]).optional(),
  startDate: z12.string().optional(),
  endDate: z12.string().optional()
});

// src/modules/report/report.routes.ts
var router12 = Router12();
router12.use(authenticate, requireActiveSubscription);
router12.get("/dashboard", ReportController.getDashboardMetrics);
router12.get("/sales/daily", validateRequest({ query: reportDateRangeSchema }), ReportController.getDailySales);
router12.get("/sales/weekly", validateRequest({ query: reportDateRangeSchema }), ReportController.getWeeklySales);
router12.get("/sales/monthly", validateRequest({ query: reportDateRangeSchema }), ReportController.getMonthlySales);
router12.get(
  "/sales/branch-wise",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ query: reportDateRangeSchema }),
  ReportController.getBranchWiseSales
);
router12.get(
  "/sales/region-wise",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  requireTier("GROWTH"),
  validateRequest({ query: reportDateRangeSchema }),
  ReportController.getRegionWiseSales
);
router12.get(
  "/sales/company-wide",
  authorize(["COMPANY_OWNER", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ query: reportDateRangeSchema }),
  ReportController.getCompanyWideSales
);
router12.get("/inventory", ReportController.getInventoryReport);
router12.get(
  "/vat-mis",
  authorize(["COMPANY_OWNER", "AUDITOR", "ACCOUNTS", "SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ query: vatMisReportSchema }),
  ReportController.getVatMisReport
);

// src/modules/audit/audit.routes.ts
import { Router as Router13 } from "express";

// src/modules/audit/audit.service.ts
var AuditLogService = class {
  static async listLogs(tenantId, query, userRole, userBranchId) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (["BRANCH_MANAGER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: "insensitive" };
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } }
        }
      })
    ]);
    const userIds = logs.map((l) => l.userId).filter(Boolean);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true, role: true }
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const enrichedLogs = logs.map((l) => ({
      ...l,
      user: l.userId ? userMap.get(l.userId) || null : null
    }));
    return {
      data: enrichedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async getLogDetails(id, tenantId) {
    const log = await prisma.auditLog.findFirst({
      where: { id, tenantId },
      include: {
        branch: true
      }
    });
    if (!log) {
      throw new Error("Audit log entry not found");
    }
    let user = null;
    if (log.userId) {
      user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { id: true, name: true, username: true, role: true }
      });
    }
    return {
      ...log,
      user
    };
  }
};

// src/modules/audit/audit.controller.ts
var AuditController = class {
  static async listLogs(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await AuditLogService.listLogs(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getLogDetails(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const log = await AuditLogService.getLogDetails(id, tenantId);
      res.status(200).json({ success: true, data: log });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
};

// src/modules/audit/audit.validation.ts
import { z as z13 } from "zod";
var listAuditLogsQuerySchema = z13.object({
  page: z13.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z13.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  action: z13.string().optional(),
  userId: z13.string().uuid().optional(),
  branchId: z13.string().uuid().optional(),
  startDate: z13.string().optional(),
  endDate: z13.string().optional()
});

// src/modules/audit/audit.routes.ts
var router13 = Router13();
router13.use(
  authenticate,
  requireActiveSubscription,
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR", "SUPER_ADMIN"])
);
router13.get("/", validateRequest({ query: listAuditLogsQuerySchema }), AuditController.listLogs);
router13.get("/:id", AuditController.getLogDetails);

// src/modules/notification/notification.routes.ts
import { Router as Router14 } from "express";

// src/modules/notification/notification.service.ts
var NotificationService = class {
  static async listNotifications(tenantId, query, userRole, userBranchId) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.OR = [
        { branchId: userBranchId },
        { branchId: null }
      ];
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.isRead !== void 0) {
      where.isRead = query.isRead;
    }
    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } }
        }
      })
    ]);
    return {
      data: notifications,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async markAsRead(id, tenantId) {
    const notification = await prisma.notification.findFirst({
      where: { id, tenantId }
    });
    if (!notification) {
      throw new Error("Notification not found");
    }
    return await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }
  static async markAllAsRead(tenantId, branchId) {
    const where = { tenantId, isRead: false };
    if (branchId) {
      where.branchId = branchId;
    }
    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true }
    });
    return { updatedCount: result.count };
  }
  static async getAlertsByType(tenantId, type) {
    return await prisma.notification.findMany({
      where: { tenantId, type, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
  }
};

// src/modules/notification/notification.controller.ts
var NotificationController = class {
  static async listNotifications(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await NotificationService.listNotifications(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const updated = await NotificationService.markAsRead(id, tenantId);
      res.status(200).json({ success: true, message: "Marked as read", data: updated });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async markAllAsRead(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.user.branchId;
      const result = await NotificationService.markAllAsRead(tenantId, branchId);
      res.status(200).json({ success: true, message: "All notifications marked as read", data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getLowStockAlerts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const alerts = await NotificationService.getAlertsByType(tenantId, "LOW_STOCK");
      res.status(200).json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getExpiryAlerts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const alerts = await NotificationService.getAlertsByType(tenantId, "EXPIRY");
      res.status(200).json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getSyncFailureAlerts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const alerts = await NotificationService.getAlertsByType(tenantId, "SYNC_FAILURE");
      res.status(200).json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/modules/notification/notification.validation.ts
import { z as z14 } from "zod";
var listNotificationsQuerySchema = z14.object({
  page: z14.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z14.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  type: z14.enum(["LOW_STOCK", "EXPIRY", "SYNC_FAILURE", "SYSTEM"]).optional(),
  isRead: z14.string().optional().transform((v) => v === "true" ? true : v === "false" ? false : void 0),
  branchId: z14.string().uuid().optional()
});

// src/modules/notification/notification.routes.ts
var router14 = Router14();
router14.use(authenticate, requireActiveSubscription);
router14.get("/", validateRequest({ query: listNotificationsQuerySchema }), NotificationController.listNotifications);
router14.get("/low-stock", NotificationController.getLowStockAlerts);
router14.get("/expiry", NotificationController.getExpiryAlerts);
router14.get("/sync-failures", NotificationController.getSyncFailureAlerts);
router14.patch("/read-all", NotificationController.markAllAsRead);
router14.patch("/:id/read", NotificationController.markAsRead);

// src/modules/sync/sync.routes.ts
import { Router as Router15 } from "express";

// src/modules/sync/sync.service.ts
var SyncService = class {
  /**
   * Push Offline Sales from Edge (Idempotent & Additive)
   */
  static async pushSales(tenantId, data) {
    const { branchId, sales } = data;
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId }
    });
    if (!branch) {
      throw new Error("Branch not found or unauthorized");
    }
    const processed = [];
    const duplicates = [];
    const errors = [];
    for (const saleEvent of sales) {
      try {
        const existingSale = await prisma.sale.findUnique({
          where: { receiptNo: saleEvent.receiptNo }
        });
        if (existingSale) {
          duplicates.push({
            receiptNo: saleEvent.receiptNo,
            localId: saleEvent.localId,
            status: "ALREADY_SYNCED"
          });
          continue;
        }
        const sale = await prisma.$transaction(async (tx) => {
          const createdSale = await tx.sale.create({
            data: {
              tenantId,
              branchId,
              userId: saleEvent.userId,
              receiptNo: saleEvent.receiptNo,
              subTotal: saleEvent.subTotal,
              discount: saleEvent.discount,
              tax: saleEvent.tax,
              totalAmount: saleEvent.totalAmount,
              paymentMethod: saleEvent.paymentMethod,
              status: saleEvent.status,
              notes: saleEvent.notes || null,
              managerApprovedBy: saleEvent.managerApprovedBy || null,
              prescriptionRef: saleEvent.prescriptionRef || null,
              localCreatedAt: new Date(saleEvent.localCreatedAt),
              syncedAt: /* @__PURE__ */ new Date(),
              items: {
                create: saleEvent.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subTotal: item.subTotal
                }))
              }
            }
          });
          for (const item of saleEvent.items) {
            const inv = await tx.inventory.findFirst({
              where: { branchId, productId: item.productId }
            });
            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: Math.max(0, inv.quantity - item.quantity) }
              });
            }
            await tx.stockMovement.create({
              data: {
                branchId,
                productId: item.productId,
                type: "SALE",
                quantity: -item.quantity,
                reason: `Offline Sync POS Sale #${saleEvent.receiptNo}`,
                referenceId: createdSale.id,
                performedBy: saleEvent.userId
              }
            });
          }
          return createdSale;
        });
        processed.push({
          localId: saleEvent.localId,
          receiptNo: sale.receiptNo,
          cloudId: sale.id,
          status: "SYNCED"
        });
      } catch (err) {
        errors.push({
          receiptNo: saleEvent.receiptNo,
          localId: saleEvent.localId,
          error: err.message
        });
      }
    }
    await prisma.syncLog.create({
      data: {
        branchId,
        direction: "BRANCH_TO_CLOUD",
        status: errors.length === 0 ? "SUCCESS" : "FAILED",
        payloadType: "SALES_PUSH",
        payload: {
          total: sales.length,
          processed: processed.length,
          duplicates: duplicates.length,
          errors: errors.length
        },
        error: errors.length > 0 ? JSON.stringify(errors) : null,
        processedAt: /* @__PURE__ */ new Date()
      }
    });
    if (errors.length > 0) {
      await prisma.notification.create({
        data: {
          tenantId,
          branchId,
          title: "Sync Warning: Offline Sales Push",
          message: `${errors.length} sale transactions failed during branch sync at ${branch.name}.`,
          type: "SYNC_FAILURE"
        }
      });
    }
    return {
      totalReceived: sales.length,
      syncedCount: processed.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      synced: processed,
      duplicates,
      errors
    };
  }
  /**
   * Push Stock Adjustments from Edge
   */
  static async pushStockAdjustments(tenantId, data) {
    const { branchId, adjustments } = data;
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId }
    });
    if (!branch) {
      throw new Error("Branch not found or unauthorized");
    }
    const processed = [];
    const errors = [];
    for (const adj of adjustments) {
      try {
        await prisma.$transaction(async (tx) => {
          let inv = await tx.inventory.findFirst({
            where: { branchId, productId: adj.productId }
          });
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity: Math.max(0, inv.quantity + adj.quantityChange),
                ...adj.batchNumber && { batchNumber: adj.batchNumber },
                ...adj.expiryDate && { expiryDate: new Date(adj.expiryDate) }
              }
            });
          } else {
            await tx.inventory.create({
              data: {
                branchId,
                productId: adj.productId,
                quantity: Math.max(0, adj.quantityChange),
                batchNumber: adj.batchNumber || null,
                expiryDate: adj.expiryDate ? new Date(adj.expiryDate) : null
              }
            });
          }
          await tx.stockMovement.create({
            data: {
              branchId,
              productId: adj.productId,
              type: adj.type,
              quantity: adj.quantityChange,
              reason: adj.reason || "Offline Stock Sync"
            }
          });
        });
        processed.push({ localId: adj.localId, status: "SYNCED" });
      } catch (err) {
        errors.push({ localId: adj.localId, error: err.message });
      }
    }
    await prisma.syncLog.create({
      data: {
        branchId,
        direction: "BRANCH_TO_CLOUD",
        status: errors.length === 0 ? "SUCCESS" : "FAILED",
        payloadType: "STOCK_PUSH",
        payload: { total: adjustments.length, synced: processed.length, errors: errors.length },
        error: errors.length > 0 ? JSON.stringify(errors) : null,
        processedAt: /* @__PURE__ */ new Date()
      }
    });
    return {
      totalReceived: adjustments.length,
      syncedCount: processed.length,
      errorCount: errors.length,
      synced: processed,
      errors
    };
  }
  /**
   * Pull Cloud Updates to Edge (Cloud catalog/pricing wins)
   */
  static async pullUpdates(tenantId, query) {
    const { branchId, lastSyncedAt } = query;
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      include: { tenant: true }
    });
    if (!branch) {
      throw new Error("Branch not found or unauthorized");
    }
    const sinceDate = lastSyncedAt ? new Date(lastSyncedAt) : /* @__PURE__ */ new Date(0);
    const [products, priceOverrides, users, permissions] = await Promise.all([
      // Central Catalog
      prisma.product.findMany({
        where: {
          tenantId,
          updatedAt: { gte: sinceDate }
        }
      }),
      // Branch Price Overrides
      prisma.branchProduct.findMany({
        where: {
          branchId,
          updatedAt: { gte: sinceDate }
        }
      }),
      // Branch Staff
      prisma.user.findMany({
        where: {
          tenantId,
          OR: [{ branchId }, { branchId: null }, { role: "COMPANY_OWNER" }, { role: "REGIONAL_ADMIN" }],
          updatedAt: { gte: sinceDate }
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
          role: true,
          username: true,
          passwordHash: true,
          // required for offline auth proxy
          name: true,
          isActive: true,
          updatedAt: true
        }
      }),
      // Role Permissions
      prisma.rolePermission.findMany()
    ]);
    const serverTimestamp = /* @__PURE__ */ new Date();
    await prisma.syncLog.create({
      data: {
        branchId,
        direction: "CLOUD_TO_BRANCH",
        status: "SUCCESS",
        payloadType: "PULL_UPDATES",
        payload: {
          productsCount: products.length,
          overridesCount: priceOverrides.length,
          usersCount: users.length
        },
        processedAt: serverTimestamp
      }
    });
    return {
      serverTimestamp,
      tenant: {
        id: branch.tenant.id,
        name: branch.tenant.name,
        tier: branch.tenant.tier
      },
      branch: {
        id: branch.id,
        name: branch.name,
        location: branch.location
      },
      catalog: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        basePrice: Number(p.basePrice),
        category: p.category,
        unit: p.unit,
        isControlled: p.isControlled,
        requiresPrescription: p.requiresPrescription,
        isActive: p.isActive,
        updatedAt: p.updatedAt
      })),
      priceOverrides: priceOverrides.map((o) => ({
        productId: o.productId,
        price: Number(o.price),
        updatedAt: o.updatedAt
      })),
      staff: users,
      rolePermissions: permissions
    };
  }
  /**
   * Get Sync Status for Branch
   */
  static async getSyncStatus(tenantId, branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId }
    });
    if (!branch) {
      throw new Error("Branch not found");
    }
    const lastSyncLog = await prisma.syncLog.findFirst({
      where: { branchId },
      orderBy: { createdAt: "desc" }
    });
    const failedCount = await prisma.syncLog.count({
      where: { branchId, status: "FAILED" }
    });
    return {
      branchId,
      branchName: branch.name,
      lastSyncedAt: lastSyncLog ? lastSyncLog.createdAt : null,
      lastSyncStatus: lastSyncLog ? lastSyncLog.status : "NEVER_SYNCED",
      recentFailedSyncs: failedCount,
      isHealthy: failedCount === 0
    };
  }
  /**
   * List Sync Logs
   */
  static async listSyncLogs(tenantId, query, userRole, userBranchId) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = {
      branch: { tenantId }
    };
    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.direction) {
      where.direction = query.direction;
    }
    const [total, logs] = await Promise.all([
      prisma.syncLog.count({ where }),
      prisma.syncLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } }
        }
      })
    ]);
    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

// src/modules/sync/sync.controller.ts
var SyncController = class {
  static async pushSales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const result = await SyncService.pushSales(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Offline sales batch processed",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async pushStock(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const result = await SyncService.pushStockAdjustments(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Offline stock adjustments batch processed",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async pullUpdates(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const result = await SyncService.pullUpdates(tenantId, query);
      res.status(200).json({
        success: true,
        message: "Cloud updates fetched successfully",
        data: result
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getSyncStatus(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { branchId } = req.params;
      const result = await SyncService.getSyncStatus(tenantId, branchId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  static async listSyncLogs(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const result = await SyncService.listSyncLogs(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/modules/sync/sync.validation.ts
import { z as z15 } from "zod";
var offlineSaleItemSchema = z15.object({
  productId: z15.string().uuid(),
  quantity: z15.number().int().positive(),
  unitPrice: z15.number().positive(),
  subTotal: z15.number().positive()
});
var offlineSaleEventSchema = z15.object({
  localId: z15.string(),
  // Edge event ID
  receiptNo: z15.string().min(3),
  branchId: z15.string().uuid(),
  userId: z15.string().uuid(),
  subTotal: z15.number().nonnegative(),
  discount: z15.number().nonnegative().default(0),
  tax: z15.number().nonnegative().default(0),
  totalAmount: z15.number().nonnegative(),
  paymentMethod: z15.enum(["CASH", "CARD", "MOBILE"]).default("CASH"),
  status: z15.enum(["COMPLETED", "REFUNDED", "VOIDED"]).default("COMPLETED"),
  notes: z15.string().optional(),
  managerApprovedBy: z15.string().optional(),
  prescriptionRef: z15.string().optional(),
  localCreatedAt: z15.string().datetime().or(z15.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  items: z15.array(offlineSaleItemSchema).min(1)
});
var pushSalesBatchSchema = z15.object({
  branchId: z15.string().uuid("Invalid branch ID format"),
  sales: z15.array(offlineSaleEventSchema).min(1, "Must contain at least one sale event")
});
var offlineStockAdjustmentSchema = z15.object({
  localId: z15.string(),
  branchId: z15.string().uuid(),
  productId: z15.string().uuid(),
  quantityChange: z15.number().int(),
  type: z15.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN"
  ]),
  reason: z15.string().optional(),
  batchNumber: z15.string().optional(),
  expiryDate: z15.string().datetime().or(z15.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  localCreatedAt: z15.string().datetime().or(z15.string().regex(/^\d{4}-\d{2}-\d{2}/))
});
var pushStockBatchSchema = z15.object({
  branchId: z15.string().uuid("Invalid branch ID format"),
  adjustments: z15.array(offlineStockAdjustmentSchema).min(1)
});
var pullUpdatesQuerySchema = z15.object({
  branchId: z15.string().uuid("Invalid branch ID format"),
  lastSyncedAt: z15.string().datetime().or(z15.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional()
});
var listSyncLogsQuerySchema = z15.object({
  page: z15.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z15.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  branchId: z15.string().uuid().optional(),
  status: z15.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
  direction: z15.enum(["CLOUD_TO_BRANCH", "BRANCH_TO_CLOUD"]).optional()
});

// src/modules/sync/sync.routes.ts
var router15 = Router15();
router15.use(authenticate, requireActiveSubscription);
router15.post("/push/sales", validateRequest({ body: pushSalesBatchSchema }), SyncController.pushSales);
router15.post("/push/stock", validateRequest({ body: pushStockBatchSchema }), SyncController.pushStock);
router15.get("/pull", validateRequest({ query: pullUpdatesQuerySchema }), SyncController.pullUpdates);
router15.get("/status/:branchId", SyncController.getSyncStatus);
router15.get("/logs", validateRequest({ query: listSyncLogsQuerySchema }), SyncController.listSyncLogs);

// src/modules/settings/settings.routes.ts
import { Router as Router16 } from "express";

// src/modules/settings/settings.controller.ts
var SettingsController = class {
  static async getPublicSettings(req, res) {
    try {
      const data = await SettingsService.getPublicSettings();
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getAdminSettings(req, res) {
    try {
      const data = await SettingsService.getAdminSettings();
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async updateSettings(req, res) {
    try {
      const updated = await SettingsService.updateSettings(req.body);
      res.status(200).json({
        success: true,
        message: "Platform settings updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getTenantVatSettings(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context required" });
        return;
      }
      const data = await SettingsService.getTenantVatSettings(tenantId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async updateTenantVatSettings(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context required" });
        return;
      }
      const updated = await SettingsService.updateTenantVatSettings(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "VAT settings updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async getPharmacySettings(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context required" });
        return;
      }
      const data = await SettingsService.getPharmacySettings(tenantId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async updatePharmacySettings(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context required" });
        return;
      }
      const updated = await SettingsService.updatePharmacySettings(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Pharmacy settings updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};

// src/modules/settings/settings.validation.ts
import { z as z16 } from "zod";
var updatePlatformSettingsSchema = z16.object({
  siteName: z16.string().min(2).optional(),
  logoUrl: z16.string().optional(),
  logoPublicId: z16.string().optional(),
  primaryColor: z16.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid HEX color format").optional(),
  hero: z16.object({
    badge: z16.string().optional(),
    title: z16.string().min(3).optional(),
    subtitle: z16.string().optional(),
    ctaPrimaryText: z16.string().optional(),
    ctaSecondaryText: z16.string().optional()
  }).optional(),
  features: z16.array(
    z16.object({
      id: z16.string().optional(),
      title: z16.string(),
      description: z16.string(),
      icon: z16.string().optional()
    })
  ).optional(),
  howItWorks: z16.array(
    z16.object({
      step: z16.number(),
      title: z16.string(),
      description: z16.string()
    })
  ).optional(),
  contact: z16.object({
    email: z16.string().email().optional(),
    phone: z16.string().optional(),
    address: z16.string().optional(),
    supportHours: z16.string().optional()
  }).optional(),
  about: z16.object({
    headline: z16.string().optional(),
    description: z16.string().optional(),
    stats: z16.array(z16.object({ label: z16.string(), value: z16.string() })).optional()
  }).optional()
});

// src/modules/settings/settings.routes.ts
var router16 = Router16();
router16.get("/public", SettingsController.getPublicSettings);
router16.get(
  "/admin",
  authenticate,
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SettingsController.getAdminSettings
);
router16.patch(
  "/admin",
  authenticate,
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ body: updatePlatformSettingsSchema }),
  SettingsController.updateSettings
);
router16.get("/vat", authenticate, SettingsController.getTenantVatSettings);
router16.put(
  "/vat",
  authenticate,
  requirePermission("pos.vat"),
  SettingsController.updateTenantVatSettings
);
router16.get("/pharmacy", authenticate, SettingsController.getPharmacySettings);
router16.put("/pharmacy", authenticate, SettingsController.updatePharmacySettings);

// src/modules/upload/upload.routes.ts
import { Router as Router17 } from "express";
import multer from "multer";

// src/modules/upload/upload.controller.ts
var UploadController = class {
  /**
   * POST /api/upload/image
   */
  static async uploadImage(req, res) {
    try {
      let fileData = req.body.image || req.body.file;
      const files = req.files;
      if (!fileData && files) {
        if (files["file"]?.[0]?.buffer) {
          fileData = files["file"][0].buffer;
        } else if (files["image"]?.[0]?.buffer) {
          fileData = files["image"][0].buffer;
        }
      }
      if (!fileData && req.file?.buffer) {
        fileData = req.file.buffer;
      }
      const folder = req.body.folder || "pharmacy_saas/general";
      const oldPublicId = req.body.oldPublicId;
      if (!fileData) {
        res.status(400).json({
          success: false,
          message: "No image or document provided. Send base64 data URI or multipart file."
        });
        return;
      }
      const result = await UploadService.uploadImage(fileData, folder, oldPublicId);
      res.status(200).json({
        success: true,
        message: "Image uploaded successfully to Cloudinary",
        data: {
          url: result.secureUrl,
          publicId: result.publicId,
          format: result.format,
          bytes: result.bytes
        }
      });
    } catch (error) {
      console.error("[Upload Error]", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image to Cloudinary"
      });
    }
  }
  /**
   * DELETE /api/upload/image
   */
  static async deleteImage(req, res) {
    try {
      const publicId = req.body.publicId || req.query.publicId;
      if (!publicId) {
        res.status(400).json({
          success: false,
          message: "publicId is required to delete Cloudinary asset"
        });
        return;
      }
      const result = await UploadService.deleteImage(publicId);
      res.status(200).json({
        success: true,
        message: "Cloudinary asset deleted successfully",
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete Cloudinary image"
      });
    }
  }
};

// src/modules/upload/upload.routes.ts
var router17 = Router17();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});
router17.post(
  "/image",
  authenticate,
  upload.fields([{ name: "file", maxCount: 1 }, { name: "image", maxCount: 1 }]),
  UploadController.uploadImage
);
router17.delete("/image", authenticate, UploadController.deleteImage);

// src/modules/supplier/supplier.routes.ts
import { Router as Router18 } from "express";

// src/modules/supplier/supplier.service.ts
var SupplierService = class {
  /**
   * List suppliers with search and pagination
   */
  static async listSuppliers(tenantId, query) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
        { company: { contains: query.search, mode: "insensitive" } },
        { contactPerson: { contains: query.search, mode: "insensitive" } }
      ];
    }
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          contacts: {
            where: { isActive: true },
            take: 10,
            orderBy: { createdAt: "desc" }
          },
          _count: {
            select: { purchases: true, inventories: true, contacts: true }
          }
        }
      }),
      prisma.supplier.count({ where })
    ]);
    const isFiltered = Boolean(query.startDate || query.endDate || query.branchId && query.branchId !== "all");
    if (isFiltered && suppliers.length > 0) {
      const supplierIds = suppliers.map((s) => s.id);
      const purchaseWhere = { tenantId, supplierId: { in: supplierIds } };
      if (query.branchId && query.branchId !== "all") {
        purchaseWhere.branchId = query.branchId;
      }
      if (query.startDate || query.endDate) {
        purchaseWhere.purchaseDate = {};
        if (query.startDate) purchaseWhere.purchaseDate.gte = new Date(query.startDate);
        if (query.endDate) {
          const end = new Date(query.endDate);
          end.setHours(23, 59, 59, 999);
          purchaseWhere.purchaseDate.lte = end;
        }
      }
      const purchases = await prisma.purchase.findMany({
        where: purchaseWhere,
        select: { supplierId: true, totalAmount: true, paidAmount: true, dueAmount: true }
      });
      const statsMap = /* @__PURE__ */ new Map();
      for (const p of purchases) {
        if (!p.supplierId) continue;
        const curr = statsMap.get(p.supplierId) || { totalPurchased: 0, totalPaid: 0, totalDue: 0 };
        curr.totalPurchased += Number(p.totalAmount || 0);
        curr.totalPaid += Number(p.paidAmount || 0);
        curr.totalDue += Number(p.dueAmount || 0);
        statsMap.set(p.supplierId, curr);
      }
      const formattedSuppliers = suppliers.map((s) => {
        const stats = statsMap.get(s.id) || { totalPurchased: 0, totalPaid: 0, totalDue: 0 };
        return {
          ...s,
          periodPurchased: stats.totalPurchased,
          periodPaid: stats.totalPaid,
          periodDue: stats.totalDue,
          totalPurchased: stats.totalPurchased > 0 ? stats.totalPurchased : Number(s.totalPurchased || 0),
          totalPaid: stats.totalPaid > 0 ? stats.totalPaid : Number(s.totalPaid || 0)
        };
      });
      return {
        data: formattedSuppliers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }
    return {
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Get single supplier with contacts, purchase history, and payments
   */
  static async getSupplierById(id, tenantId, options) {
    const purchaseWhere = {};
    const paymentWhere = {};
    if (options?.startDate || options?.endDate) {
      const dateFilter = {};
      if (options.startDate) {
        dateFilter.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      purchaseWhere.purchaseDate = dateFilter;
      paymentWhere.paymentDate = dateFilter;
    }
    const [supplier, purchaseAgg, paymentAgg] = await Promise.all([
      prisma.supplier.findFirst({
        where: { id, tenantId },
        include: {
          contacts: {
            orderBy: { createdAt: "desc" }
          },
          purchases: {
            where: purchaseWhere,
            orderBy: { purchaseDate: "desc" },
            take: 100,
            include: {
              branch: { select: { id: true, name: true } },
              contactPerson: { select: { id: true, name: true, phone: true, designation: true } },
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true, unit: true } }
                }
              }
            }
          },
          payments: {
            where: paymentWhere,
            orderBy: { paymentDate: "desc" },
            take: 50,
            include: {
              branch: { select: { id: true, name: true } },
              financialAccount: { select: { id: true, name: true, type: true } }
            }
          },
          _count: {
            select: { purchases: true, contacts: true, inventories: true }
          }
        }
      }),
      prisma.purchase.aggregate({
        where: { supplierId: id, tenantId, ...purchaseWhere },
        _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
        _count: { id: true }
      }),
      prisma.supplierPayment.aggregate({
        where: { supplierId: id, tenantId, ...paymentWhere },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const isFiltered = Boolean(options?.startDate || options?.endDate);
    const periodStats = {
      totalPurchased: isFiltered ? Number(purchaseAgg._sum?.totalAmount || 0) : Number(supplier.totalPurchased || 0),
      totalPaid: isFiltered ? Number(paymentAgg._sum?.amount || 0) : Number(supplier.totalPaid || 0),
      totalDue: isFiltered ? Number(purchaseAgg._sum?.dueAmount || 0) : Number(supplier.totalDue || 0),
      purchasesCount: isFiltered ? purchaseAgg._count?.id || 0 : supplier._count?.purchases || 0,
      paymentsCount: paymentAgg._count?.id || 0,
      lifetimeTotalPurchased: Number(supplier.totalPurchased || 0),
      lifetimeTotalPaid: Number(supplier.totalPaid || 0),
      lifetimeTotalDue: Number(supplier.totalDue || 0),
      isFiltered
    };
    return {
      ...supplier,
      periodStats,
      stats: periodStats
    };
  }
  /**
   * Create new supplier and optional initial contacts
   */
  static async createSupplier(tenantId, userId, data) {
    const supplierName = data.name.trim();
    const primaryPhone = data.phone?.trim() || (data.contacts && data.contacts.length > 0 ? data.contacts[0].phone.trim() : "\u2014");
    const primaryContact = data.contactPerson?.trim() || (data.contacts && data.contacts.length > 0 ? data.contacts[0].name.trim() : null);
    const supplier = await prisma.$transaction(async (tx) => {
      const sup = await tx.supplier.create({
        data: {
          tenantId,
          name: supplierName,
          phone: primaryPhone,
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          company: data.company?.trim() || supplierName,
          contactPerson: primaryContact,
          totalPurchased: 0,
          totalPaid: 0,
          totalDue: 0,
          isActive: true
        }
      });
      if (data.contacts && data.contacts.length > 0) {
        for (const c of data.contacts) {
          if (c.name && c.phone) {
            await tx.supplierContact.create({
              data: {
                tenantId,
                supplierId: sup.id,
                name: c.name.trim(),
                phone: c.phone.trim(),
                email: c.email?.trim() || null,
                designation: c.designation?.trim() || null,
                isActive: c.isActive !== void 0 ? c.isActive : true
              }
            });
          }
        }
      }
      return sup;
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "CREATE_SUPPLIER",
      details: { name: supplier.name, phone: supplier.phone }
    });
    return supplier;
  }
  /**
   * Contact Person management methods
   */
  static async listContacts(supplierId, tenantId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId }
    });
    if (!supplier) throw new Error("Supplier not found");
    return prisma.supplierContact.findMany({
      where: { supplierId, tenantId },
      orderBy: { createdAt: "desc" }
    });
  }
  static async createContact(supplierId, tenantId, data) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId }
    });
    if (!supplier) throw new Error("Supplier not found");
    const contact = await prisma.supplierContact.create({
      data: {
        tenantId,
        supplierId,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        designation: data.designation?.trim() || null,
        isActive: data.isActive !== void 0 ? data.isActive : true
      }
    });
    if (!supplier.contactPerson || supplier.phone === "\u2014") {
      await prisma.supplier.update({
        where: { id: supplierId },
        data: {
          contactPerson: supplier.contactPerson || contact.name,
          phone: supplier.phone === "\u2014" ? contact.phone : supplier.phone
        }
      });
    }
    return contact;
  }
  static async updateContact(contactId, supplierId, tenantId, data) {
    const contact = await prisma.supplierContact.findFirst({
      where: { id: contactId, supplierId, tenantId }
    });
    if (!contact) throw new Error("Contact person not found");
    const updated = await prisma.supplierContact.update({
      where: { id: contactId },
      data: {
        ...data.name && { name: data.name.trim() },
        ...data.phone && { phone: data.phone.trim() },
        ...data.email !== void 0 && { email: data.email?.trim() || null },
        ...data.designation !== void 0 && { designation: data.designation?.trim() || null },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
    return updated;
  }
  static async deleteContact(contactId, supplierId, tenantId) {
    const contact = await prisma.supplierContact.findFirst({
      where: { id: contactId, supplierId, tenantId }
    });
    if (!contact) throw new Error("Contact person not found");
    const updated = await prisma.supplierContact.update({
      where: { id: contactId },
      data: { isActive: false }
    });
    return { message: "Contact deactivated successfully", contact: updated };
  }
  /**
   * Update supplier
   */
  static async updateSupplier(id, tenantId, userId, data) {
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      throw new Error("Supplier not found");
    }
    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...data.name && { name: data.name.trim(), company: data.company?.trim() || data.name.trim() },
        ...data.phone && { phone: data.phone.trim() },
        ...data.email !== void 0 && { email: data.email?.trim() || null },
        ...data.address !== void 0 && { address: data.address?.trim() || null },
        ...data.company !== void 0 && { company: data.company?.trim() || data.name?.trim() || existing.name },
        ...data.contactPerson !== void 0 && { contactPerson: data.contactPerson?.trim() || null },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "UPDATE_SUPPLIER",
      details: data
    });
    return updated;
  }
  /**
   * Delete supplier (or soft delete)
   */
  static async deleteSupplier(id, tenantId, userId) {
    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { purchases: true } }
      }
    });
    if (!existing) {
      throw new Error("Supplier not found");
    }
    if (existing._count.purchases > 0) {
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false }
      });
      return { message: "Supplier marked as inactive as purchase history exists" };
    }
    await prisma.supplier.delete({
      where: { id }
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "DELETE_SUPPLIER",
      details: { name: existing.name }
    });
    return { message: "Supplier deleted successfully" };
  }
  /**
   * Record Stock Purchase (Inward) with Supplier Financials & Batch Inventory
   */
  static async recordPurchase(tenantId, userId, data) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId, isActive: true }
    });
    if (!branch) {
      throw new Error("Branch not found or inactive");
    }
    let supplier = null;
    if (data.supplierId) {
      supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId }
      });
      if (!supplier) {
        throw new Error("Supplier not found");
      }
    }
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, isActive: true }
    });
    if (products.length !== productIds.length) {
      throw new Error("One or more selected products are invalid or inactive");
    }
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotalAmount = 0;
    const preparedItems = data.items.map((item) => {
      const prod = productMap.get(item.productId);
      const itemTotal = item.lineTotal !== void 0 && item.lineTotal !== null ? Number(item.lineTotal) : Number(item.unitPurchasePrice) * item.quantity;
      subtotalAmount += itemTotal;
      return {
        productId: item.productId,
        batchNumber: item.batchNumber || null,
        barcode: item.barcode || prod.barcode || null,
        mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        packageType: item.packageType || "MEDICINE",
        cartonQuantity: item.cartonQuantity || null,
        boxQuantity: item.boxQuantity || null,
        stripsPerBox: item.stripsPerBox || prod.stripsPerBox || null,
        tabletsPerStrip: item.tabletsPerStrip || prod.tabletsPerStrip || null,
        quantity: item.quantity,
        unitPurchasePrice: item.unitPurchasePrice,
        unitSellingPrice: item.unitSellingPrice,
        totalAmount: itemTotal,
        shelfLocation: item.shelfLocation || prod.shelfLocation || null
      };
    });
    let invoiceDiscount = 0;
    if (data.discountType === "PERCENT") {
      invoiceDiscount = subtotalAmount * (Number(data.discountAmount) || 0) / 100;
    } else if (data.discountType === "FIXED") {
      invoiceDiscount = Number(data.discountAmount) || 0;
    }
    const invoiceTax = Number(data.taxAmount) || 0;
    const computedTotal = Math.max(0, Math.round((subtotalAmount - invoiceDiscount + invoiceTax) * 100) / 100);
    const totalPurchaseAmount = data.totalAmount !== void 0 && data.totalAmount !== null ? Number(data.totalAmount) : computedTotal;
    const paidAmount = Number(data.paidAmount || 0);
    const dueAmount = Math.max(0, Math.round((totalPurchaseAmount - paidAmount) * 100) / 100);
    const paymentStatus = dueAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE";
    const noteParts = [];
    if (data.notes) noteParts.push(data.notes);
    if (invoiceDiscount > 0) noteParts.push(`Discount: -\u09F3${invoiceDiscount.toFixed(2)} (${data.discountType})`);
    if (invoiceTax > 0) noteParts.push(`Tax: +\u09F3${invoiceTax.toFixed(2)}`);
    const finalNotes = noteParts.length > 0 ? noteParts.join(" | ") : null;
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : /* @__PURE__ */ new Date();
    const result = await prisma.$transaction(async (tx) => {
      let contactPersonName = data.contactPersonName || null;
      if (data.contactPersonId) {
        const cp = await prisma.supplierContact.findFirst({
          where: { id: data.contactPersonId, tenantId }
        });
        if (cp) {
          contactPersonName = cp.name;
        }
      } else if (supplier && supplier.contactPerson) {
        contactPersonName = supplier.contactPerson;
      }
      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          branchId: data.branchId,
          supplierId: data.supplierId || null,
          contactPersonId: data.contactPersonId || null,
          contactPersonName,
          invoiceNo: data.invoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
          purchaseDate,
          totalAmount: totalPurchaseAmount,
          paidAmount,
          dueAmount,
          paymentStatus,
          paymentMethod: data.paymentMethod || "CASH",
          notes: finalNotes,
          receivedBy: userId,
          items: {
            create: preparedItems
          }
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true } }
            }
          },
          supplier: true,
          contactPerson: true,
          branch: { select: { id: true, name: true } }
        }
      });
      if (data.supplierId && supplier) {
        await tx.supplier.update({
          where: { id: data.supplierId },
          data: {
            totalPurchased: { increment: totalPurchaseAmount },
            totalPaid: { increment: paidAmount },
            totalDue: { increment: dueAmount }
          }
        });
      }
      if (paidAmount > 0) {
        if (!data.financialAccountId) {
          throw new Error("A valid financial account for the selected branch is required when paying a purchase invoice.");
        }
        const finAcc = await tx.financialAccount.findFirst({
          where: { id: data.financialAccountId, tenantId, branchId: data.branchId, isActive: true }
        });
        if (!finAcc) {
          throw new Error("Selected financial account does not exist or does not belong to this branch.");
        }
        await tx.financialAccount.update({
          where: { id: finAcc.id },
          data: { balance: { decrement: paidAmount } }
        });
        await tx.financialTransaction.create({
          data: {
            tenantId,
            branchId: data.branchId,
            sourceAccountId: finAcc.id,
            amount: paidAmount,
            type: "PURCHASE_PAYMENT",
            reference: purchase.invoiceNo,
            note: `Purchase invoice #${purchase.invoiceNo} via ${finAcc.name}`,
            userId
          }
        });
        if (data.supplierId) {
          await tx.supplierPayment.create({
            data: {
              tenantId,
              supplierId: data.supplierId,
              branchId: data.branchId,
              purchaseId: purchase.id,
              financialAccountId: finAcc.id,
              amount: paidAmount,
              previousDue: Number(supplier ? supplier.totalDue : 0),
              remainingDue: Math.max(0, Number(supplier ? supplier.totalDue : 0) + dueAmount),
              paymentMethod: data.paymentMethod || finAcc.type || "CASH",
              reference: purchase.invoiceNo,
              notes: `Initial payment at purchase for invoice #${purchase.invoiceNo}`,
              paidBy: userId,
              paymentDate: purchaseDate
            }
          });
        }
      }
      for (const item of preparedItems) {
        let existingInventory = null;
        if (item.batchNumber) {
          existingInventory = await tx.inventory.findFirst({
            where: {
              branchId: data.branchId,
              productId: item.productId,
              batchNumber: item.batchNumber
            }
          });
        }
        let inventoryId;
        if (existingInventory) {
          const updatedInv = await tx.inventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: { increment: item.quantity },
              purchasePrice: item.unitPurchasePrice,
              sellingPrice: item.unitSellingPrice,
              supplierId: data.supplierId || existingInventory.supplierId,
              shelfLocation: item.shelfLocation || existingInventory.shelfLocation,
              receivedDate: data.purchaseDate ? new Date(data.purchaseDate) : existingInventory.receivedDate || /* @__PURE__ */ new Date()
            }
          });
          inventoryId = updatedInv.id;
        } else {
          const newInv = await tx.inventory.create({
            data: {
              branchId: data.branchId,
              productId: item.productId,
              supplierId: data.supplierId || null,
              quantity: item.quantity,
              initialQuantity: item.quantity,
              batchNumber: item.batchNumber,
              barcode: item.barcode,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              receivedDate: data.purchaseDate ? new Date(data.purchaseDate) : /* @__PURE__ */ new Date(),
              packageType: item.packageType,
              boxQuantity: item.boxQuantity,
              stripsPerBox: item.stripsPerBox,
              tabletsPerStrip: item.tabletsPerStrip,
              purchasePrice: item.unitPurchasePrice,
              sellingPrice: item.unitSellingPrice,
              shelfLocation: item.shelfLocation
            }
          });
          inventoryId = newInv.id;
        }
        await tx.stockMovement.create({
          data: {
            branchId: data.branchId,
            productId: item.productId,
            inventoryId,
            batchNumber: item.batchNumber,
            type: "PURCHASE",
            quantity: item.quantity,
            unitPrice: item.unitPurchasePrice,
            reason: `Purchase Invoice #${purchase.invoiceNo}`,
            performedBy: userId,
            referenceId: purchase.id
          }
        });
        await tx.batchReceivingRecord.create({
          data: {
            inventoryId,
            branchId: data.branchId,
            productId: item.productId,
            supplierId: data.supplierId || null,
            contactPersonId: data.contactPersonId || null,
            contactPersonName: purchase.contactPersonName || null,
            batchNumber: item.batchNumber || null,
            receivingUnit: item.cartonQuantity && item.cartonQuantity > 0 ? "CARTON" : "BOX",
            cartonsReceived: item.cartonQuantity || 0,
            boxesPerCarton: item.cartonQuantity && item.cartonQuantity > 0 ? Math.round((item.boxQuantity || 0) / item.cartonQuantity) || 10 : 10,
            boxesReceived: item.boxQuantity || 0,
            stripsPerBox: item.stripsPerBox || 10,
            tabletsPerStrip: item.tabletsPerStrip || 10,
            totalQuantity: item.quantity,
            purchasePrice: item.unitPurchasePrice,
            sellingPrice: item.unitSellingPrice,
            receivedDate: data.purchaseDate ? new Date(data.purchaseDate) : /* @__PURE__ */ new Date(),
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            invoiceNo: purchase.invoiceNo || null,
            notes: data.notes || null,
            receivedBy: userId
          }
        });
      }
      return purchase;
    });
    await AuditService.log({
      tenantId,
      userId,
      branchId: data.branchId,
      action: "PURCHASE_STOCK",
      details: {
        invoiceNo: result.invoiceNo,
        totalAmount: totalPurchaseAmount,
        itemCount: preparedItems.length,
        supplierName: supplier?.name || "Direct / Unassigned"
      }
    });
    return result;
  }
  /**
   * List purchases with filters and pagination
   */
  static async listPurchases(tenantId, query, userRole, userBranchId) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (userRole === "BRANCH_MANAGER" || userRole === "CASHIER") {
      if (userBranchId) where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.contactPersonId) {
      where.contactPersonId = query.contactPersonId;
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.startDate || query.endDate) {
      where.purchaseDate = {};
      if (query.startDate) where.purchaseDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { invoiceNo: { contains: query.search, mode: "insensitive" } },
        { contactPersonName: { contains: query.search, mode: "insensitive" } },
        { supplier: { name: { contains: query.search, mode: "insensitive" } } },
        { contactPerson: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: "desc" },
        include: {
          supplier: { select: { id: true, name: true, phone: true, company: true } },
          contactPerson: { select: { id: true, name: true, phone: true, designation: true } },
          branch: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true } }
            }
          }
        }
      }),
      prisma.purchase.count({ where })
    ]);
    return {
      data: purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Record payment against a supplier's outstanding due
   */
  static async recordSupplierPayment(supplierId, tenantId, userId, data) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId }
    });
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    if (!data.financialAccountId) {
      throw new Error("Financial account is required for recording supplier payment.");
    }
    const financialAcc = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, tenantId, isActive: true }
    });
    if (!financialAcc) {
      throw new Error("Selected financial account does not exist or is inactive.");
    }
    const payAmount = Number(data.amount);
    const newDue = Math.max(0, Number(supplier.totalDue) - payAmount);
    const newPaid = Number(supplier.totalPaid) + payAmount;
    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : /* @__PURE__ */ new Date();
    const openPurchases = await prisma.purchase.findMany({
      where: { tenantId, supplierId, dueAmount: { gt: 0 } },
      orderBy: { purchaseDate: "asc" }
    });
    let remainingPay = payAmount;
    for (const p of openPurchases) {
      if (remainingPay <= 0) break;
      const pDue = Number(p.dueAmount || 0);
      const pPaid = Number(p.paidAmount || 0);
      const chunk = Math.min(pDue, remainingPay);
      const nextDue = pDue - chunk;
      const nextPaid = pPaid + chunk;
      const status = nextDue === 0 ? "PAID" : "PARTIAL";
      await prisma.purchase.update({
        where: { id: p.id },
        data: {
          dueAmount: nextDue,
          paidAmount: nextPaid,
          paymentStatus: status
        }
      });
      remainingPay -= chunk;
    }
    const [updated, paymentRecord] = await prisma.$transaction(async (tx) => {
      const sup = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          totalPaid: newPaid,
          totalDue: newDue
        }
      });
      const pRecord = await tx.supplierPayment.create({
        data: {
          tenantId,
          supplierId,
          branchId: data.branchId || financialAcc.branchId,
          purchaseId: data.purchaseId || null,
          financialAccountId: financialAcc.id,
          amount: payAmount,
          previousDue: Number(supplier.totalDue || 0),
          remainingDue: newDue,
          paymentMethod: data.paymentMethod || financialAcc.type || "CASH",
          reference: data.reference || `PAY-${supplier.name.slice(0, 12)}-${Date.now().toString().slice(-4)}`,
          notes: data.notes || `Supplier payment for ${supplier.name} via ${financialAcc.name}`,
          paidBy: userId,
          paymentDate
        }
      });
      await tx.financialAccount.update({
        where: { id: financialAcc.id },
        data: { balance: { decrement: payAmount } }
      });
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId || financialAcc.branchId,
          sourceAccountId: financialAcc.id,
          amount: payAmount,
          type: "PURCHASE_PAYMENT",
          reference: pRecord.reference,
          note: pRecord.notes,
          userId
        }
      });
      return [sup, pRecord];
    });
    await AuditService.log({
      tenantId,
      userId,
      action: "SUPPLIER_PAYMENT",
      details: {
        supplierId,
        amountPaid: payAmount,
        previousDue: supplier.totalDue,
        remainingDue: newDue,
        notes: data.notes
      }
    });
    return { ...updated, payment: paymentRecord };
  }
  /**
   * List recorded supplier settlement payments
   */
  static async listSupplierPayments(tenantId, query) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.startDate || query.endDate) {
      where.paymentDate = {};
      if (query.startDate) where.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
        { supplier: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }
    const [payments, total] = await Promise.all([
      prisma.supplierPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          supplier: { select: { id: true, name: true, phone: true, company: true } },
          branch: { select: { id: true, name: true } },
          purchase: { select: { id: true, invoiceNo: true, totalAmount: true } },
          financialAccount: { select: { id: true, name: true, type: true } }
        }
      }),
      prisma.supplierPayment.count({ where })
    ]);
    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Summary metrics for supplier dues and purchases across filters
   */
  static async getSupplierDueSummary(tenantId, query) {
    const purchaseWhere = { tenantId };
    const paymentWhere = { tenantId };
    const supplierWhere = { tenantId, isActive: true };
    if (query.supplierId) {
      purchaseWhere.supplierId = query.supplierId;
      paymentWhere.supplierId = query.supplierId;
      supplierWhere.id = query.supplierId;
    }
    if (query.branchId && query.branchId !== "all") {
      purchaseWhere.branchId = query.branchId;
      paymentWhere.branchId = query.branchId;
    }
    if (query.startDate || query.endDate) {
      purchaseWhere.purchaseDate = {};
      paymentWhere.paymentDate = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        purchaseWhere.purchaseDate.gte = start;
        paymentWhere.paymentDate.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        purchaseWhere.purchaseDate.lte = end;
        paymentWhere.paymentDate.lte = end;
      }
    }
    const [purchases, payments, suppliers] = await Promise.all([
      prisma.purchase.findMany({
        where: purchaseWhere,
        select: { totalAmount: true, paidAmount: true, dueAmount: true }
      }),
      prisma.supplierPayment.findMany({
        where: paymentWhere,
        select: { amount: true }
      }),
      prisma.supplier.findMany({
        where: supplierWhere,
        select: { id: true, totalPurchased: true, totalPaid: true, totalDue: true }
      })
    ]);
    const totalPurchase = purchases.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
    const paymentsSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const purchasePaidSum = purchases.reduce((acc, p) => acc + Number(p.paidAmount || 0), 0);
    const totalPaidInPeriod = Math.max(paymentsSum, purchasePaidSum);
    const totalDueInPeriod = purchases.reduce((acc, p) => acc + Number(p.dueAmount || 0), 0);
    const lifetimePurchases = suppliers.reduce((acc, s) => acc + Number(s.totalPurchased || 0), 0);
    const lifetimePaid = suppliers.reduce((acc, s) => acc + Number(s.totalPaid || 0), 0);
    const lifetimeDue = suppliers.reduce((acc, s) => acc + Number(s.totalDue || 0), 0);
    return {
      totalPurchases: totalPurchase,
      totalPaid: totalPaidInPeriod,
      totalDue: totalDueInPeriod,
      dueCount: purchases.filter((p) => Number(p.dueAmount || 0) > 0).length,
      filtered: {
        totalPurchase,
        totalPurchases: totalPurchase,
        totalPaid: totalPaidInPeriod,
        totalDue: totalDueInPeriod,
        count: purchases.length
      },
      overall: {
        totalPurchase: lifetimePurchases,
        totalPaid: lifetimePaid,
        totalDue: lifetimeDue,
        supplierCount: suppliers.length
      }
    };
  }
};

// src/modules/supplier/supplier.controller.ts
var SupplierController = class {
  static async listSuppliers(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const result = await SupplierService.listSuppliers(tenantId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getSupplierById(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const { startDate, endDate } = req.query;
      const supplier = await SupplierService.getSupplierById(id, tenantId, { startDate, endDate });
      res.status(200).json({ success: true, data: supplier });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
  // --- Contact Person Handlers ---
  static async listContacts(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const contacts = await SupplierService.listContacts(id, tenantId);
      res.status(200).json({ success: true, data: contacts });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async createContact(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const contact = await SupplierService.createContact(id, tenantId, req.body);
      res.status(201).json({ success: true, message: "Contact person created successfully", data: contact });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateContact(req, res) {
    try {
      const { id, contactId } = req.params;
      const tenantId = req.user.tenantId;
      const contact = await SupplierService.updateContact(contactId, id, tenantId, req.body);
      res.status(200).json({ success: true, message: "Contact person updated successfully", data: contact });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteContact(req, res) {
    try {
      const { id, contactId } = req.params;
      const tenantId = req.user.tenantId;
      const result = await SupplierService.deleteContact(contactId, id, tenantId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async createSupplier(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const supplier = await SupplierService.createSupplier(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Supplier created successfully",
        data: supplier
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async updateSupplier(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const updated = await SupplierService.updateSupplier(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Supplier updated successfully",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async deleteSupplier(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await SupplierService.deleteSupplier(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async recordPurchase(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const purchase = await SupplierService.recordPurchase(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Purchase & stock inward recorded successfully",
        data: purchase
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listPurchases(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = { ...req.query };
      if (!query.branchId && req.headers["x-branch-id"]) {
        const headerBranch = req.headers["x-branch-id"].trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          query.branchId = headerBranch;
        }
      }
      const result = await SupplierService.listPurchases(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getSupplierPurchases(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = { ...req.query, supplierId: id };
      if (!query.branchId && req.headers["x-branch-id"]) {
        const headerBranch = req.headers["x-branch-id"].trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          query.branchId = headerBranch;
        }
      }
      const result = await SupplierService.listPurchases(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async recordSupplierPayment(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const updated = await SupplierService.recordSupplierPayment(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Payment recorded against supplier due",
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async listSupplierPayments(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const result = await SupplierService.listSupplierPayments(tenantId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async getSupplierDueSummary(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const query = req.query;
      const result = await SupplierService.getSupplierDueSummary(tenantId, query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// src/modules/supplier/supplier.validation.ts
import { z as z17 } from "zod";
var contactPersonInputSchema = z17.object({
  name: z17.string().min(2, "Contact person name is required"),
  phone: z17.string().min(5, "Contact phone number is required"),
  email: z17.string().email("Invalid email format").optional().nullable(),
  designation: z17.string().optional().nullable(),
  isActive: z17.boolean().optional().default(true)
});
var createSupplierSchema = z17.object({
  name: z17.string().min(2, "Company / Supplier name is required"),
  phone: z17.string().min(5, "Contact phone number is required").optional().nullable(),
  email: z17.string().email("Invalid email format").optional().nullable(),
  address: z17.string().optional().nullable(),
  company: z17.string().optional().nullable(),
  contactPerson: z17.string().optional().nullable(),
  contacts: z17.array(contactPersonInputSchema).optional().default([])
});
var updateSupplierSchema = z17.object({
  name: z17.string().min(2).optional(),
  phone: z17.string().optional().nullable(),
  email: z17.string().email().optional().nullable(),
  address: z17.string().optional().nullable(),
  company: z17.string().optional().nullable(),
  contactPerson: z17.string().optional().nullable(),
  isActive: z17.boolean().optional()
});
var listSuppliersQuerySchema = z17.object({
  search: z17.string().optional(),
  branchId: z17.string().optional(),
  startDate: z17.string().optional(),
  endDate: z17.string().optional(),
  page: z17.coerce.number().int().positive().default(1),
  limit: z17.coerce.number().int().positive().default(50)
});
var createContactSchema = contactPersonInputSchema;
var updateContactSchema = contactPersonInputSchema.partial();
var purchaseItemInputSchema = z17.object({
  productId: z17.string().min(1, "Product is required"),
  batchNumber: z17.string().optional().nullable(),
  barcode: z17.string().optional().nullable(),
  mfgDate: z17.string().optional().nullable(),
  expiryDate: z17.string().optional().nullable(),
  packageType: z17.string().optional().nullable().default("Medicine"),
  receivingUnit: z17.enum(["CARTON", "BOX", "STRIP", "PIECE"]).optional().default("BOX"),
  cartonQuantity: z17.number().int().nonnegative().optional().nullable(),
  boxQuantity: z17.number().int().nonnegative().optional().nullable(),
  stripsPerBox: z17.number().int().nonnegative().optional().nullable(),
  tabletsPerStrip: z17.number().int().nonnegative().optional().nullable(),
  quantity: z17.number().int().positive("Quantity must be at least 1"),
  unitPurchasePrice: z17.number().nonnegative("Purchase price must be positive"),
  unitSellingPrice: z17.number().nonnegative("Selling price must be positive"),
  unitCostBeforeDiscount: z17.number().nonnegative().optional().nullable(),
  discountPercent: z17.number().nonnegative().optional().default(0),
  profitMarginPercent: z17.number().optional().nullable(),
  lineTotal: z17.number().nonnegative().optional().nullable(),
  shelfLocation: z17.string().optional().nullable()
});
var createPurchaseSchema = z17.object({
  branchId: z17.string().min(1, "Branch is required"),
  supplierId: z17.string().optional().nullable(),
  contactPersonId: z17.string().optional().nullable(),
  contactPersonName: z17.string().optional().nullable(),
  invoiceNo: z17.string().optional().nullable(),
  purchaseDate: z17.string().optional(),
  items: z17.array(purchaseItemInputSchema).min(1, "At least one item is required in purchase"),
  discountType: z17.enum(["NONE", "FIXED", "PERCENT"]).optional().default("NONE"),
  discountAmount: z17.number().nonnegative().optional().default(0),
  taxAmount: z17.number().nonnegative().optional().default(0),
  subtotal: z17.number().nonnegative().optional().nullable(),
  totalAmount: z17.number().nonnegative().optional().nullable(),
  paidAmount: z17.number().nonnegative().default(0),
  paymentMethod: z17.string().default("CASH"),
  financialAccountId: z17.string().optional().nullable(),
  notes: z17.string().optional().nullable()
});
var listPurchasesQuerySchema = z17.object({
  branchId: z17.string().optional(),
  supplierId: z17.string().optional(),
  contactPersonId: z17.string().optional(),
  search: z17.string().optional(),
  startDate: z17.string().optional(),
  endDate: z17.string().optional(),
  paymentStatus: z17.enum(["PAID", "PARTIAL", "DUE"]).optional(),
  page: z17.coerce.number().int().positive().default(1),
  limit: z17.coerce.number().int().positive().default(50)
});
var recordSupplierPaymentSchema = z17.object({
  amount: z17.number().positive("Payment amount must be greater than 0"),
  branchId: z17.string().optional().nullable(),
  purchaseId: z17.string().optional().nullable(),
  financialAccountId: z17.string().min(1, "Financial account is required"),
  paymentMethod: z17.string().optional().nullable(),
  reference: z17.string().optional().nullable(),
  notes: z17.string().optional().nullable(),
  paymentDate: z17.string().optional().nullable()
});
var listSupplierPaymentsQuerySchema = z17.object({
  branchId: z17.string().optional(),
  supplierId: z17.string().optional(),
  search: z17.string().optional(),
  startDate: z17.string().optional(),
  endDate: z17.string().optional(),
  page: z17.coerce.number().int().positive().default(1),
  limit: z17.coerce.number().int().positive().default(50)
});
var supplierDueSummaryQuerySchema = z17.object({
  branchId: z17.string().optional(),
  supplierId: z17.string().optional(),
  startDate: z17.string().optional(),
  endDate: z17.string().optional()
});

// src/modules/supplier/supplier.routes.ts
var router18 = Router18();
router18.use(authenticate, requireActiveSubscription);
router18.get(
  "/",
  requirePermission("supplier.view"),
  validateRequest({ query: listSuppliersQuerySchema }),
  SupplierController.listSuppliers
);
router18.post(
  "/",
  requirePermission("supplier.manage"),
  validateRequest({ body: createSupplierSchema }),
  SupplierController.createSupplier
);
router18.get(
  "/purchases/list",
  requirePermission("supplier.purchase_history"),
  validateRequest({ query: listPurchasesQuerySchema }),
  SupplierController.listPurchases
);
router18.post(
  "/purchases",
  requirePermission("stock.add_stock"),
  validateRequest({ body: createPurchaseSchema }),
  SupplierController.recordPurchase
);
router18.get(
  "/payments/list",
  requirePermission("supplier.payments_due"),
  validateRequest({ query: listSupplierPaymentsQuerySchema }),
  SupplierController.listSupplierPayments
);
router18.get(
  "/due-summary",
  requirePermission("supplier.payments_due"),
  validateRequest({ query: supplierDueSummaryQuerySchema }),
  SupplierController.getSupplierDueSummary
);
router18.get(
  "/:id",
  requirePermission("supplier.view"),
  SupplierController.getSupplierById
);
router18.patch(
  "/:id",
  requirePermission("supplier.manage"),
  validateRequest({ body: updateSupplierSchema }),
  SupplierController.updateSupplier
);
router18.delete(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  SupplierController.deleteSupplier
);
router18.get(
  "/:id/purchases",
  requirePermission("supplier.purchase_history"),
  SupplierController.getSupplierPurchases
);
router18.get(
  "/:id/contacts",
  requirePermission("supplier.contacts"),
  SupplierController.listContacts
);
router18.post(
  "/:id/contacts",
  requirePermission("supplier.contacts"),
  validateRequest({ body: createContactSchema }),
  SupplierController.createContact
);
router18.patch(
  "/:id/contacts/:contactId",
  requirePermission("supplier.contacts"),
  validateRequest({ body: updateContactSchema }),
  SupplierController.updateContact
);
router18.delete(
  "/:id/contacts/:contactId",
  requirePermission("supplier.contacts"),
  SupplierController.deleteContact
);
router18.post(
  "/:id/payments",
  requirePermission("supplier.payments_due"),
  validateRequest({ body: recordSupplierPaymentSchema }),
  SupplierController.recordSupplierPayment
);
var supplierRoutes = router18;

// src/modules/accounting/accounting.routes.ts
import { Router as Router19 } from "express";

// src/modules/attendance/attendance.service.ts
var DAY_INDEX_MAP = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY"
};
var AttendanceService = class {
  /**
   * Helper: computes month calendar days, off-days, and working days
   */
  static getMonthDaysAndOffDays(month, weeklyOffDays = ["FRIDAY"], customOffDates = []) {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const totalDays = new Date(year, monthNum, 0).getDate();
    const normalizedWeeklyOffs = weeklyOffDays.map((d) => d.trim().toUpperCase());
    const customOffSet = new Set(customOffDates.map((d) => d.trim()));
    const calendarDays = [];
    let offDaysCount = 0;
    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(year, monthNum - 1, day);
      const dateStr = `${yearStr}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeekName = DAY_INDEX_MAP[dayDate.getDay()];
      const isWeeklyOff = normalizedWeeklyOffs.includes(dayOfWeekName);
      const isCustomOff = customOffSet.has(dateStr);
      const isOffDay = isWeeklyOff || isCustomOff;
      if (isOffDay) {
        offDaysCount++;
      }
      calendarDays.push({
        date: dateStr,
        dayNumber: day,
        dayOfWeek: dayOfWeekName,
        isOffDay,
        isWeeklyOff,
        isCustomOff
      });
    }
    const workingDaysCount = Math.max(0, totalDays - offDaysCount);
    return {
      month,
      year,
      monthNum,
      totalDays,
      offDaysCount,
      workingDaysCount,
      calendarDays
    };
  }
  /**
   * 1. Get branch off-day configuration for a month
   */
  static async getBranchOffDayConfig(tenantId, branchId, month) {
    const config = await prisma.branchOffDayConfig.findUnique({
      where: {
        branchId_month: { branchId, month }
      }
    });
    const weeklyOffDays = config?.weeklyOffDays || ["FRIDAY"];
    const customOffDates = config?.customOffDates || [];
    const meta = this.getMonthDaysAndOffDays(month, weeklyOffDays, customOffDates);
    return {
      config,
      weeklyOffDays,
      customOffDates,
      notes: config?.notes || null,
      meta
    };
  }
  /**
   * 2. Save branch off-day configuration for a month (Manager / Owner)
   */
  static async setBranchOffDayConfig(tenantId, branchId, month, data, actorId) {
    const weeklyOffDays = data.weeklyOffDays.map((d) => d.trim().toUpperCase());
    const customOffDates = (data.customOffDates || []).map((d) => d.trim());
    const saved = await prisma.branchOffDayConfig.upsert({
      where: {
        branchId_month: { branchId, month }
      },
      update: {
        weeklyOffDays,
        customOffDates,
        notes: data.notes?.trim() || null
      },
      create: {
        tenantId,
        branchId,
        month,
        weeklyOffDays,
        customOffDates,
        notes: data.notes?.trim() || null,
        createdById: actorId
      }
    });
    await AuditService.log({
      tenantId,
      branchId,
      userId: actorId,
      action: "BRANCH_OFF_DAYS_CONFIGURED",
      details: { month, weeklyOffDays, customOffDates }
    });
    const meta = this.getMonthDaysAndOffDays(month, weeklyOffDays, customOffDates);
    return { saved, meta };
  }
  /**
   * 3. Get daily attendance sheet for a branch on a specific date
   */
  static async getDailyAttendanceSheet(tenantId, branchId, date) {
    const month = date.slice(0, 7);
    const offDayData = await this.getBranchOffDayConfig(tenantId, branchId, month);
    const dayMeta = offDayData.meta.calendarDays.find((d) => d.date === date);
    const isOffDay = dayMeta?.isOffDay || false;
    const employees = await prisma.user.findMany({
      where: {
        tenantId,
        branchId,
        role: {
          notIn: ["COMPANY_OWNER", "SUPER_ADMIN"]
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
        avatarUrl: true,
        phone: true,
        salaryConfig: {
          select: {
            baseSalary: true,
            netSalary: true
          }
        }
      },
      orderBy: [{ name: "asc" }, { username: "asc" }]
    });
    const existing = await prisma.employeeAttendance.findMany({
      where: {
        tenantId,
        branchId,
        date
      },
      include: {
        markedBy: {
          select: { id: true, name: true, username: true }
        }
      }
    });
    const recordMap = new Map(existing.map((r) => [r.userId, r]));
    const roster = employees.map((emp) => {
      const record = recordMap.get(emp.id);
      return {
        id: emp.id,
        name: emp.name,
        username: emp.username,
        role: emp.customRoleName || emp.pharmacyRoleName || emp.role.replace(/_/g, " "),
        avatarUrl: emp.avatarUrl,
        phone: emp.phone,
        status: record ? record.status : isOffDay ? "OFF_DAY" : "PRESENT",
        hasSavedRecord: Boolean(record),
        notes: record?.notes || "",
        markedBy: record?.markedBy || null,
        updatedAt: record?.updatedAt || null
      };
    });
    return {
      date,
      month,
      isOffDay,
      dayOfWeek: dayMeta?.dayOfWeek || "",
      roster
    };
  }
  /**
   * 4. Manager saves/finalizes daily attendance in bulk
   */
  static async markBulkDailyAttendance(tenantId, branchId, date, data, actorId) {
    const results = await prisma.$transaction(
      data.attendances.map(
        (item) => prisma.employeeAttendance.upsert({
          where: {
            userId_date: {
              userId: item.userId,
              date
            }
          },
          update: {
            status: item.status,
            notes: item.notes?.trim() || null,
            markedById: actorId
          },
          create: {
            tenantId,
            branchId,
            userId: item.userId,
            date,
            status: item.status,
            notes: item.notes?.trim() || null,
            markedById: actorId
          }
        })
      )
    );
    await AuditService.log({
      tenantId,
      branchId,
      userId: actorId,
      action: "ATTENDANCE_BULK_MARKED",
      details: { date, count: results.length }
    });
    return results;
  }
  /**
   * 5. Get complete attendance history for a single employee in a month
   */
  static async getEmployeeAttendanceHistory(tenantId, userId, month, requestingUser) {
    const employee = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        salaryConfig: true
      }
    });
    if (!employee) throw new Error("Employee not found.");
    if (requestingUser) {
      const isOwnerOrAdmin = requestingUser.role === "COMPANY_OWNER" || requestingUser.role === "SUPER_ADMIN" || requestingUser.role === "REGIONAL_ADMIN";
      const isBranchManager = requestingUser.role === "BRANCH_MANAGER" || requestingUser.pharmacyRoleName?.toLowerCase().includes("branch manager") || requestingUser.customRoleName?.toLowerCase().includes("branch manager");
      if (isBranchManager && !isOwnerOrAdmin) {
        const reqBranchId = requestingUser.branchId;
        if (reqBranchId && employee.branchId && employee.branchId !== reqBranchId) {
          throw new Error("Access denied: You can only view attendance history of employees in your branch.");
        }
      }
    }
    const branchId = employee.branchId;
    if (!branchId) throw new Error("Employee is not assigned to a branch.");
    const offDayData = await this.getBranchOffDayConfig(tenantId, branchId, month);
    const { calendarDays, totalDays, offDaysCount, workingDaysCount } = offDayData.meta;
    const attendances = await prisma.employeeAttendance.findMany({
      where: {
        tenantId,
        userId,
        date: {
          startsWith: month
        }
      },
      include: {
        markedBy: { select: { id: true, name: true, username: true } }
      }
    });
    const recordMap = new Map(attendances.map((a) => [a.date, a]));
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let offDays = 0;
    const now = /* @__PURE__ */ new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const history = calendarDays.map((day) => {
      const record = recordMap.get(day.date);
      let status;
      if (record) {
        status = record.status;
      } else if (day.isOffDay) {
        status = "OFF_DAY";
      } else {
        if (day.date < todayStr) {
          status = "ABSENT";
        } else {
          status = "NOT_MARKED";
        }
      }
      if (status === "PRESENT") presentDays++;
      else if (status === "ABSENT") absentDays++;
      else if (status === "LATE") lateDays++;
      else if (status === "PAID_LEAVE") paidLeaveDays++;
      else if (status === "UNPAID_LEAVE") unpaidLeaveDays++;
      else if (status === "OFF_DAY") offDays++;
      return {
        date: day.date,
        dayNumber: day.dayNumber,
        dayOfWeek: day.dayOfWeek,
        isOffDay: day.isOffDay,
        status,
        notes: record?.notes || null,
        markedBy: record?.markedBy || null
      };
    });
    return {
      employee: {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        role: employee.customRoleName || employee.pharmacyRoleName || employee.role.replace(/_/g, " "),
        branch: employee.branch,
        isActive: employee.isActive,
        resignationDate: employee.resignationDate,
        resignationReason: employee.resignationReason,
        deactivatedAt: employee.deactivatedAt
      },
      month,
      summary: {
        totalDays,
        offDays,
        totalWorkingDays: workingDaysCount,
        presentDays,
        absentDays,
        lateDays,
        paidLeaveDays,
        unpaidLeaveDays
      },
      history
    };
  }
  /**
   * 6. Calculate monthly salary with automatic attendance deduction and dynamic allowances
   */
  static async calculateMonthlySalary(tenantId, branchId, userId, month) {
    const employee = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        salaryConfig: true,
        branch: { select: { id: true, name: true } }
      }
    });
    if (!employee) throw new Error("Employee not found.");
    const config = employee.salaryConfig;
    const baseSalary = Number(config?.baseSalary || 0);
    const packageAllowances = Number(config?.allowances || 0);
    const packageDeductions = Number(config?.deductions || 0);
    const attendanceData = await this.getEmployeeAttendanceHistory(tenantId, userId, month);
    const { totalDays, offDays, totalWorkingDays, presentDays, absentDays, lateDays, paidLeaveDays, unpaidLeaveDays } = attendanceData.summary;
    const dailyRate = totalWorkingDays > 0 ? Number((baseSalary / totalWorkingDays).toFixed(2)) : 0;
    const deductionRule = await prisma.salaryDeductionRule.findUnique({
      where: { branchId }
    });
    let penalDays = unpaidLeaveDays;
    const absentRatio = deductionRule?.absentRuleRatio ? Number(deductionRule.absentRuleRatio) : 1;
    if (absentRatio > 0) {
      penalDays += absentDays / absentRatio;
    }
    const lateRatio = deductionRule?.lateRuleRatio ? Number(deductionRule.lateRuleRatio) : 0;
    if (lateRatio > 0) {
      penalDays += lateDays / lateRatio;
    }
    const attendanceDeduction = Number((penalDays * dailyRate).toFixed(2));
    const monthlyAllowances = await prisma.employeeMonthlyAllowance.findMany({
      where: {
        tenantId,
        branchId,
        userId,
        month
      },
      orderBy: { createdAt: "asc" }
    });
    const dynamicAllowancesTotal = monthlyAllowances.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const totalAllowances = Number((packageAllowances + dynamicAllowancesTotal).toFixed(2));
    const totalDeductions = Number((packageDeductions + attendanceDeduction).toFixed(2));
    const finalPayable = Math.max(0, Number((baseSalary - attendanceDeduction + totalAllowances - packageDeductions).toFixed(2)));
    const disbursements = await prisma.salaryDisbursement.findMany({
      where: { tenantId, userId, month },
      include: {
        financialAccount: { select: { id: true, name: true, type: true } },
        disbursedBy: { select: { id: true, name: true, username: true } }
      },
      orderBy: { paymentDate: "desc" }
    });
    const paidAmount = disbursements.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
    const dueAmount = Math.max(0, Number((finalPayable - paidAmount).toFixed(2)));
    const status = finalPayable > 0 && paidAmount >= finalPayable ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE";
    return {
      employee: {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        role: employee.customRoleName || employee.pharmacyRoleName || employee.role.replace(/_/g, " "),
        branch: employee.branch,
        isActive: employee.isActive,
        resignationDate: employee.resignationDate
      },
      month,
      metrics: {
        baseSalary,
        totalDays,
        offDays,
        totalWorkingDays,
        presentDays,
        absentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        dailyRate,
        attendanceDeduction,
        // Locked/read-only
        packageAllowances,
        dynamicAllowancesTotal,
        totalAllowances,
        otherDeductions: packageDeductions,
        totalDeductions,
        finalPayable,
        paidAmount,
        dueAmount,
        status
      },
      monthlyAllowances,
      disbursements
    };
  }
  /**
   * 7. Branch Monthly Attendance and Payroll Summary for all branch staff
   */
  static async getBranchMonthlyAttendanceSummary(tenantId, branchId, month) {
    const employees = await prisma.user.findMany({
      where: {
        tenantId,
        branchId,
        role: {
          notIn: ["COMPANY_OWNER", "SUPER_ADMIN"]
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
        avatarUrl: true,
        salaryConfig: true
      },
      orderBy: [{ name: "asc" }, { username: "asc" }]
    });
    const calculations = await Promise.all(
      employees.map((emp) => this.calculateMonthlySalary(tenantId, branchId, emp.id, month))
    );
    return calculations;
  }
  /**
   * 8. Dynamic Monthly Allowances
   */
  static async listEmployeeAllowances(tenantId, branchId, userId, month) {
    return prisma.employeeMonthlyAllowance.findMany({
      where: { tenantId, branchId, userId, month },
      orderBy: { createdAt: "desc" }
    });
  }
  static async addEmployeeAllowance(tenantId, branchId, userId, month, data, actorId) {
    const allowance = await prisma.employeeMonthlyAllowance.create({
      data: {
        tenantId,
        branchId,
        userId,
        month,
        title: data.title.trim(),
        amount: data.amount,
        notes: data.notes?.trim() || null,
        createdById: actorId
      }
    });
    await AuditService.log({
      tenantId,
      branchId,
      userId: actorId,
      action: "EMPLOYEE_ALLOWANCE_ADDED",
      details: { allowanceId: allowance.id, employeeId: userId, month, title: data.title, amount: data.amount }
    });
    return allowance;
  }
  static async deleteEmployeeAllowance(tenantId, allowanceId, actorId) {
    const existing = await prisma.employeeMonthlyAllowance.findFirst({
      where: { id: allowanceId, tenantId }
    });
    if (!existing) throw new Error("Allowance not found.");
    await prisma.employeeMonthlyAllowance.delete({
      where: { id: allowanceId }
    });
    await AuditService.log({
      tenantId,
      branchId: existing.branchId,
      userId: actorId,
      action: "EMPLOYEE_ALLOWANCE_DELETED",
      details: { allowanceId, title: existing.title, amount: existing.amount }
    });
    return { success: true };
  }
  /**
   * 9. Employee Resignation / Deactivation
   */
  static async deactivateEmployee(tenantId, branchId, userId, data, actorId) {
    const employee = await prisma.user.findFirst({
      where: { id: userId, tenantId, branchId }
    });
    if (!employee) throw new Error("Employee not found in this branch.");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        resignationDate: data.resignationDate ? new Date(data.resignationDate) : /* @__PURE__ */ new Date(),
        resignationReason: data.resignationReason?.trim() || null,
        deactivatedAt: /* @__PURE__ */ new Date(),
        deactivatedById: actorId
      }
    });
    await AuditService.log({
      tenantId,
      branchId,
      userId: actorId,
      action: "EMPLOYEE_DEACTIVATED",
      details: {
        employeeId: userId,
        name: employee.name || employee.username,
        resignationDate: data.resignationDate,
        reason: data.resignationReason
      }
    });
    return updated;
  }
  static async reactivateEmployee(tenantId, branchId, userId, actorId) {
    const employee = await prisma.user.findFirst({
      where: { id: userId, tenantId, branchId }
    });
    if (!employee) throw new Error("Employee not found in this branch.");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        resignationDate: null,
        resignationReason: null,
        deactivatedAt: null,
        deactivatedById: null
      }
    });
    await AuditService.log({
      tenantId,
      branchId,
      userId: actorId,
      action: "EMPLOYEE_REACTIVATED",
      details: { employeeId: userId, name: employee.name || employee.username }
    });
    return updated;
  }
};

// src/modules/accounting/accounting.service.ts
var AccountingService = class {
  /**
   * List all financial accounts for a tenant / branch with live metadata.
   * Only returns accounts actually created by the pharmacy — no auto-seeding.
   */
  static async listAccounts(tenantId, branchId) {
    const where = { tenantId, isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }
    const accounts = await prisma.financialAccount.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { type: "asc" }, { createdAt: "asc" }],
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
    return accounts;
  }
  /**
   * Create a new custom financial account (Cash, bKash, Nagad, or named Bank Account)
   */
  static async createAccount(tenantId, userId, data) {
    const account = await prisma.financialAccount.create({
      data: {
        tenantId,
        branchId: data.branchId,
        name: data.name.trim(),
        type: data.type,
        accountNumber: data.accountNumber?.trim() || null,
        bankName: data.bankName?.trim() || null,
        branchName: data.branchName?.trim() || null,
        routingNumber: data.routingNumber?.trim() || null,
        isDefault: Boolean(data.isDefault),
        description: data.description?.trim() || null,
        balance: data.initialBalance || 0,
        isActive: true
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
    if (data.initialBalance && data.initialBalance > 0) {
      await prisma.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          destinationAccountId: account.id,
          amount: data.initialBalance,
          type: "INCOME",
          reference: "INITIAL_BALANCE",
          note: `Initial opening balance for ${account.name}`,
          userId
        }
      });
    }
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "ACCOUNT_CREATED",
      details: { accountId: account.id, name: account.name, type: account.type, balance: account.balance }
    });
    return account;
  }
  /**
   * Update an existing financial account
   */
  static async updateAccount(tenantId, accountId, userId, data) {
    const existing = await prisma.financialAccount.findFirst({
      where: { id: accountId, tenantId }
    });
    if (!existing) throw new Error("Financial account not found");
    const updated = await prisma.financialAccount.update({
      where: { id: accountId },
      data: {
        ...data.name !== void 0 && { name: data.name.trim() },
        ...data.accountNumber !== void 0 && { accountNumber: data.accountNumber?.trim() || null },
        ...data.bankName !== void 0 && { bankName: data.bankName?.trim() || null },
        ...data.branchName !== void 0 && { branchName: data.branchName?.trim() || null },
        ...data.routingNumber !== void 0 && { routingNumber: data.routingNumber?.trim() || null },
        ...data.isDefault !== void 0 && { isDefault: Boolean(data.isDefault) },
        ...data.description !== void 0 && { description: data.description?.trim() || null },
        ...data.isActive !== void 0 && { isActive: Boolean(data.isActive) }
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
    await AuditService.log({
      tenantId,
      branchId: existing.branchId,
      userId,
      action: "ACCOUNT_UPDATED",
      details: { accountId, changes: data }
    });
    return updated;
  }
  /**
   * Safely remove/deactivate a financial account so transactions, transfers, and sales history remain intact
   */
  static async deleteAccount(tenantId, accountId, userId) {
    const existing = await prisma.financialAccount.findFirst({
      where: { id: accountId, tenantId }
    });
    if (!existing) throw new Error("Financial account not found");
    if (Number(existing.balance) > 0) {
      throw new Error(
        `Cannot remove account "${existing.name}" because it still has an active balance of \u09F3${Number(existing.balance).toFixed(2)}. Please transfer or withdraw the balance to \u09F30 first.`
      );
    }
    const deactivated = await prisma.financialAccount.update({
      where: { id: accountId },
      data: { isActive: false }
    });
    await AuditService.log({
      tenantId,
      branchId: existing.branchId,
      userId,
      action: "ACCOUNT_DEACTIVATED",
      details: { accountId, name: existing.name, type: existing.type }
    });
    return deactivated;
  }
  /**
   * Deposit money into a financial account (atomic balance increment + transaction entry)
   */
  static async depositFunds(tenantId, userId, data) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, tenantId, isActive: true }
    });
    if (!account) {
      throw new Error("Financial account not found or inactive");
    }
    const depositAmount = Number(data.amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      throw new Error("Deposit amount must be greater than 0");
    }
    const noteText = data.description?.trim() || `Deposit into ${account.name}`;
    const refCode = `DEP-${Date.now().toString().slice(-6)}`;
    const result = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.financialAccount.update({
        where: { id: account.id },
        data: { balance: { increment: depositAmount } },
        include: {
          branch: { select: { id: true, name: true } }
        }
      });
      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: account.branchId,
          destinationAccountId: account.id,
          amount: depositAmount,
          type: "INCOME",
          reference: refCode,
          note: noteText,
          userId
        }
      });
      return { account: updatedAccount, transaction };
    });
    await AuditService.log({
      tenantId,
      branchId: account.branchId,
      userId,
      action: "ACCOUNT_DEPOSIT",
      details: {
        accountId: account.id,
        accountName: account.name,
        amount: depositAmount,
        note: noteText
      }
    });
    return result.account;
  }
  /**
   * Transfer funds between two accounts (Double-entry transfer ledger)
   */
  static async transferFunds(tenantId, userId, data) {
    if (data.sourceAccountId === data.destinationAccountId) {
      throw new Error("Source and destination accounts must be different");
    }
    const [sourceAcc, destAcc] = await Promise.all([
      prisma.financialAccount.findFirst({
        where: { id: data.sourceAccountId, tenantId }
      }),
      prisma.financialAccount.findFirst({
        where: { id: data.destinationAccountId, tenantId }
      })
    ]);
    if (!sourceAcc) throw new Error("Source financial account not found");
    if (!destAcc) throw new Error("Destination financial account not found");
    if (Number(sourceAcc.balance) < data.amount) {
      throw new Error(`Insufficient funds in ${sourceAcc.name}. Current balance: \u09F3${Number(sourceAcc.balance).toFixed(2)}`);
    }
    const result = await prisma.$transaction(async (tx) => {
      const updatedSource = await tx.financialAccount.update({
        where: { id: sourceAcc.id },
        data: { balance: { decrement: data.amount } }
      });
      const updatedDest = await tx.financialAccount.update({
        where: { id: destAcc.id },
        data: { balance: { increment: data.amount } }
      });
      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          sourceAccountId: sourceAcc.id,
          destinationAccountId: destAcc.id,
          amount: data.amount,
          type: "TRANSFER",
          reference: data.reference || `TRF-${Date.now().toString().slice(-6)}`,
          note: data.note || `Transferred from ${sourceAcc.name} to ${destAcc.name}`,
          userId
        },
        include: {
          sourceAccount: { select: { id: true, name: true, type: true } },
          destinationAccount: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true, username: true } }
        }
      });
      return {
        transaction,
        sourceAccount: updatedSource,
        destinationAccount: updatedDest
      };
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "FINANCIAL_TRANSFER",
      details: {
        from: sourceAcc.name,
        to: destAcc.name,
        amount: data.amount,
        sourcePreviousBalance: Number(sourceAcc.balance),
        sourceNewBalance: Number(result.sourceAccount.balance),
        destPreviousBalance: Number(destAcc.balance),
        destNewBalance: Number(result.destinationAccount.balance),
        note: data.note
      }
    });
    return result;
  }
  /**
   * Record manual Income or Expense
   */
  static async recordIncomeExpense(tenantId, userId, data) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, tenantId }
    });
    if (!account) throw new Error("Financial account not found");
    if (data.type === "EXPENSE" && Number(account.balance) < data.amount) {
      throw new Error(`Insufficient funds in ${account.name}. Current balance: \u09F3${Number(account.balance).toFixed(2)}`);
    }
    const result = await prisma.$transaction(async (tx) => {
      const isDeduction = data.type === "EXPENSE" || data.type === "PURCHASE_PAYMENT" || data.type === "REFUND";
      const updatedAccount = await tx.financialAccount.update({
        where: { id: account.id },
        data: isDeduction ? { balance: { decrement: data.amount } } : { balance: { increment: data.amount } }
      });
      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          sourceAccountId: isDeduction ? account.id : null,
          destinationAccountId: !isDeduction ? account.id : null,
          amount: data.amount,
          type: data.type,
          reference: data.reference || `${data.type.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
          note: data.note || `${data.type} recorded for ${account.name}`,
          userId
        },
        include: {
          sourceAccount: { select: { id: true, name: true, type: true } },
          destinationAccount: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true, username: true } }
        }
      });
      return { transaction, updatedAccount };
    });
    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: `FINANCIAL_${data.type}`,
      details: {
        accountId: account.id,
        accountName: account.name,
        amount: data.amount,
        type: data.type,
        newBalance: Number(result.updatedAccount.balance),
        note: data.note
      }
    });
    return result;
  }
  /**
   * List all financial transactions ledger with filtering and pagination
   */
  static async listTransactions(tenantId, query) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;
    const where = { tenantId };
    if (query.branchId) {
      where.branchId = query.branchId;
    }
    if (query.accountId) {
      where.OR = [
        { sourceAccountId: query.accountId },
        { destinationAccountId: query.accountId }
      ];
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const [total, transactions] = await Promise.all([
      prisma.financialTransaction.count({ where }),
      prisma.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sourceAccount: { select: { id: true, name: true, type: true } },
          destinationAccount: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true, username: true } },
          branch: { select: { id: true, name: true } }
        }
      })
    ]);
    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async getFinancialOverview(tenantId, branchId, options) {
    const where = { tenantId, isActive: true };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }
    const accounts = await prisma.financialAccount.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { type: "asc" }, { createdAt: "asc" }],
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
    let totalCash = 0;
    let totalBank = 0;
    let totalBkash = 0;
    let totalNagad = 0;
    let totalMobile = 0;
    let totalOther = 0;
    const bankAccountsList = [];
    for (const acc of accounts) {
      const balance = Number(acc.balance || 0);
      const accType = String(acc.type).toUpperCase();
      const nameLower = (acc.name || "").toLowerCase();
      if (accType === "CASH") {
        totalCash += balance;
      } else if (accType === "BANK" || accType === "CARD_SETTLEMENT") {
        totalBank += balance;
        bankAccountsList.push({
          id: acc.id,
          name: acc.name,
          bankName: acc.bankName || acc.name,
          accountNumber: acc.accountNumber,
          branchName: acc.branchName,
          routingNumber: acc.routingNumber,
          balance,
          isDefault: acc.isDefault,
          isActive: acc.isActive
        });
      } else if (accType === "BKASH" || accType === "MOBILE" && nameLower.includes("bkash") || nameLower.includes("bkash")) {
        totalBkash += balance;
        totalMobile += balance;
      } else if (accType === "NAGAD" || accType === "MOBILE" && nameLower.includes("nagad") || nameLower.includes("nagad")) {
        totalNagad += balance;
        totalMobile += balance;
      } else if (accType === "MOBILE") {
        totalMobile += balance;
      } else {
        totalOther += balance;
      }
    }
    const totalLiquidity = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const now = /* @__PURE__ */ new Date();
    let periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    let periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (options?.startDate) {
      const parts = options.startDate.split("-").map(Number);
      if (parts.length === 3) periodStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      else periodStart = new Date(options.startDate);
    }
    if (options?.endDate) {
      const parts = options.endDate.split("-").map(Number);
      if (parts.length === 3) periodEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      else {
        const d = new Date(options.endDate);
        d.setHours(23, 59, 59, 999);
        periodEnd = d;
      }
    } else if (options?.period === "lastMonth") {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (options?.period === "last6Months") {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (options?.period === "thisYear") {
      periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    const purchaseWhere = {
      tenantId,
      dueAmount: { gt: 0 }
    };
    if (branchId) {
      purchaseWhere.branchId = branchId;
    }
    if (options?.startDate || options?.endDate || options?.period) {
      purchaseWhere.purchaseDate = { gte: periodStart, lte: periodEnd };
    }
    const unpaidPurchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      select: { dueAmount: true }
    });
    let totalSupplierDues = unpaidPurchases.reduce(
      (sum, p) => sum + Number(p.dueAmount || 0),
      0
    );
    if (totalSupplierDues === 0 && !branchId && !options?.startDate && !options?.endDate && !options?.period) {
      const suppliers = await prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        select: { totalDue: true, dueBalance: true }
      });
      totalSupplierDues = suppliers.reduce(
        (sum, s) => sum + Number(s.totalDue ?? s.dueBalance ?? 0),
        0
      );
    }
    const periodSalesWhere = {
      tenantId,
      status: "COMPLETED",
      createdAt: { gte: periodStart, lte: periodEnd }
    };
    if (branchId) periodSalesWhere.branchId = branchId;
    const periodSales = await prisma.sale.findMany({
      where: periodSalesWhere,
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        paymentMethod: true,
        bankName: true,
        financialAccountId: true,
        notes: true,
        createdAt: true
      }
    });
    let periodTotalSales = 0;
    let periodCashSales = 0;
    let periodBkashSales = 0;
    let periodNagadSales = 0;
    let periodBankSales = 0;
    let periodOtherSales = 0;
    for (const s of periodSales) {
      const amt = Number(s.paidAmount || s.totalAmount || 0);
      periodTotalSales += amt;
      const pMethod = String(s.paymentMethod || "").toUpperCase();
      const notesLower = (s.notes || "").toLowerCase();
      if (pMethod === "CASH") {
        periodCashSales += amt;
      } else if (pMethod === "BKASH" || pMethod === "MOBILE" && notesLower.includes("bkash")) {
        periodBkashSales += amt;
      } else if (pMethod === "NAGAD" || pMethod === "MOBILE" && notesLower.includes("nagad")) {
        periodNagadSales += amt;
      } else if (pMethod === "BANK" || pMethod === "CARD") {
        periodBankSales += amt;
      } else {
        periodOtherSales += amt;
      }
    }
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todaySales = await prisma.sale.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        ...branchId ? { branchId } : {},
        createdAt: { gte: todayStart, lte: todayEnd }
      },
      select: { totalAmount: true, paidAmount: true, paymentMethod: true, createdAt: true }
    });
    let todayRevenue = 0;
    let todayCash = 0;
    let todayBkash = 0;
    let todayNagad = 0;
    let todayBank = 0;
    for (const s of todaySales) {
      const amt = Number(s.paidAmount || s.totalAmount || 0);
      todayRevenue += amt;
      const m = String(s.paymentMethod).toUpperCase();
      if (m === "CASH") todayCash += amt;
      else if (m === "BKASH") todayBkash += amt;
      else if (m === "NAGAD") todayNagad += amt;
      else if (m === "BANK" || m === "CARD") todayBank += amt;
    }
    const hourlySlots = [
      { label: "8-10 AM", startHour: 8, endHour: 10 },
      { label: "10-12 PM", startHour: 10, endHour: 12 },
      { label: "12-2 PM", startHour: 12, endHour: 14 },
      { label: "2-4 PM", startHour: 14, endHour: 16 },
      { label: "4-6 PM", startHour: 16, endHour: 18 },
      { label: "6-8 PM", startHour: 18, endHour: 20 },
      { label: "8-10 PM", startHour: 20, endHour: 22 },
      { label: "Night", startHour: 22, endHour: 24 }
    ];
    const todayHourly = hourlySlots.map((slot) => {
      const slotSales = todaySales.filter((s) => {
        const hour = new Date(s.createdAt).getHours();
        return hour >= slot.startHour && hour < slot.endHour;
      });
      const revenue = slotSales.reduce((acc, s) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
      return {
        label: slot.label,
        revenue,
        salesCount: slotSales.length
      };
    });
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dSales = await prisma.sale.findMany({
        where: {
          tenantId,
          status: "COMPLETED",
          ...branchId ? { branchId } : {},
          createdAt: { gte: dayStart, lte: dayEnd }
        },
        select: { totalAmount: true, paidAmount: true, paymentMethod: true }
      });
      const dayRevenue = dSales.reduce((acc, s) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
      let dayCash = 0;
      let dayDigital = 0;
      for (const s of dSales) {
        const amt = Number(s.paidAmount || s.totalAmount || 0);
        if (s.paymentMethod === "CASH") dayCash += amt;
        else dayDigital += amt;
      }
      last7Days.push({
        date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayName: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        dateKey: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`,
        revenue: dayRevenue,
        orderCount: dSales.length,
        cashAmount: dayCash,
        digitalAmount: dayDigital
      });
    }
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dSales = await prisma.sale.findMany({
        where: {
          tenantId,
          status: "COMPLETED",
          ...branchId ? { branchId } : {},
          createdAt: { gte: dayStart, lte: dayEnd }
        },
        select: { totalAmount: true, paidAmount: true, paymentMethod: true }
      });
      const dayRevenue = dSales.reduce((acc, s) => acc + Number(s.paidAmount || s.totalAmount || 0), 0);
      last30Days.push({
        date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayName: dayStart.toLocaleDateString("en-US", { weekday: "narrow" }),
        dateKey: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`,
        revenue: dayRevenue,
        orderCount: dSales.length
      });
    }
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1, 0, 0, 0, 0);
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const mSales = await prisma.sale.findMany({
        where: {
          tenantId,
          status: "COMPLETED",
          ...branchId ? { branchId } : {},
          createdAt: { gte: mStart, lte: mEnd }
        },
        select: {
          totalAmount: true,
          paidAmount: true,
          paymentMethod: true
        }
      });
      let mRevenue = 0;
      let mCash = 0;
      let mDigital = 0;
      for (const s of mSales) {
        const amt = Number(s.paidAmount || s.totalAmount || 0);
        mRevenue += amt;
        if (s.paymentMethod === "CASH") mCash += amt;
        else mDigital += amt;
      }
      monthlyTrend.push({
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        monthShort: mStart.toLocaleDateString("en-US", { month: "short" }),
        monthKey: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, "0")}`,
        revenue: mRevenue,
        salesCount: mSales.length,
        cashAmount: mCash,
        digitalAmount: mDigital
      });
    }
    const recentLedger = await prisma.financialTransaction.findMany({
      where: { tenantId, ...branchId ? { branchId } : {} },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        sourceAccount: { select: { id: true, name: true, type: true, bankName: true, accountNumber: true } },
        destinationAccount: { select: { id: true, name: true, type: true, bankName: true, accountNumber: true } },
        user: { select: { id: true, name: true, username: true } }
      }
    });
    return {
      summary: {
        totalSales: periodTotalSales,
        cashSales: periodCashSales,
        bkashSales: periodBkashSales,
        nagadSales: periodNagadSales,
        bankSales: periodBankSales,
        otherSales: periodOtherSales,
        totalTransactions: periodSales.length,
        totalSupplierDues,
        currentCashBalance: totalCash,
        currentBkashBalance: totalBkash,
        currentNagadBalance: totalNagad,
        currentBankBalance: totalBank,
        totalLiquidity,
        todayRevenue,
        todaySalesCount: todaySales.length,
        todayCash,
        todayBkash,
        todayNagad,
        todayBank
      },
      paymentBreakdown: {
        cash: periodCashSales,
        bkash: periodBkashSales,
        nagad: periodNagadSales,
        bank: periodBankSales,
        other: periodOtherSales,
        grandTotal: periodTotalSales
      },
      bankAccounts: bankAccountsList,
      todayHourly,
      last7Days,
      last30Days,
      monthlyTrend,
      recentLedger,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        bankName: a.bankName,
        accountNumber: a.accountNumber,
        branchName: a.branchName,
        routingNumber: a.routingNumber,
        isDefault: a.isDefault,
        isActive: a.isActive,
        description: a.description,
        balance: Number(a.balance),
        branchId: a.branchId,
        branchNameStr: a.branch?.name
      }))
    };
  }
  // ==========================================
  // 🏢 RECURRING EXPENSE BILLS (RENT, ELECTRICITY, ETC)
  // ==========================================
  static async listRecurringExpenses(tenantId, branchId, includeInactive = false) {
    const where = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }
    if (branchId) where.branchId = branchId;
    return prisma.recurringExpenseConfig.findMany({
      where,
      orderBy: [{ dueDay: "asc" }, { createdAt: "asc" }],
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
  }
  static async createRecurringExpense(tenantId, data) {
    return prisma.recurringExpenseConfig.create({
      data: {
        tenantId,
        branchId: data.branchId,
        category: data.category,
        title: data.title.trim(),
        estimatedAmount: data.estimatedAmount || 0,
        dueDay: data.dueDay || null,
        notes: data.notes?.trim() || null,
        isActive: true
      },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });
  }
  static async updateRecurringExpense(tenantId, id, data) {
    const existing = await prisma.recurringExpenseConfig.findFirst({
      where: { id, tenantId }
    });
    if (!existing) throw new Error("Recurring expense configuration not found");
    return prisma.recurringExpenseConfig.update({
      where: { id },
      data: {
        ...data.category && { category: data.category },
        ...data.title && { title: data.title.trim() },
        ...data.estimatedAmount !== void 0 && { estimatedAmount: data.estimatedAmount },
        ...data.dueDay !== void 0 && { dueDay: data.dueDay },
        ...data.notes !== void 0 && { notes: data.notes?.trim() || null },
        ...data.isActive !== void 0 && { isActive: data.isActive }
      }
    });
  }
  static async deleteRecurringExpense(tenantId, id) {
    const existing = await prisma.recurringExpenseConfig.findFirst({
      where: { id, tenantId }
    });
    if (!existing) throw new Error("Recurring expense configuration not found");
    try {
      return await prisma.recurringExpenseConfig.delete({
        where: { id }
      });
    } catch {
      return prisma.recurringExpenseConfig.update({
        where: { id },
        data: { isActive: false }
      });
    }
  }
  // ==========================================
  // 💸 ACTUAL MONTHLY EXPENSE PAYMENTS
  // ==========================================
  static async listExpenses(tenantId, query) {
    const where = { tenantId };
    const isVal = (val) => val !== void 0 && val !== null && String(val).trim() !== "" && String(val) !== "undefined" && String(val) !== "null" && String(val) !== "ALL";
    if (isVal(query.branchId)) where.branchId = query.branchId;
    if (isVal(query.category)) where.category = query.category;
    if (isVal(query.recurringConfigId)) where.recurringConfigId = query.recurringConfigId;
    if (isVal(query.financialAccountId)) where.financialAccountId = query.financialAccountId;
    if (isVal(query.expenseMonth)) where.expenseMonth = query.expenseMonth;
    if (isVal(query.startDate) || isVal(query.endDate)) {
      where.paymentDate = {};
      if (isVal(query.startDate)) where.paymentDate.gte = new Date(query.startDate);
      if (isVal(query.endDate)) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }
    const page = query.page || 1;
    const limit = query.limit || 100;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.branchExpense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
          financialAccount: { select: { id: true, name: true, type: true, accountNumber: true, bankName: true } },
          recordedBy: { select: { id: true, name: true, username: true } },
          recurringConfig: { select: { id: true, title: true, estimatedAmount: true } }
        }
      }),
      prisma.branchExpense.count({ where })
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  static async recordExpense(tenantId, userId, data) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, branchId: data.branchId, tenantId, isActive: true }
    });
    if (!account) {
      throw new Error("Invalid or inactive financial account selected for this branch.");
    }
    if (Number(account.balance) < data.amount) {
      throw new Error(
        `Insufficient balance in financial account "${account.name}". Current Balance: \u09F3${Number(account.balance).toLocaleString()}, Required: \u09F3${data.amount.toLocaleString()}`
      );
    }
    return prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({
        where: { id: data.financialAccountId },
        data: {
          balance: { decrement: data.amount }
        }
      });
      const configId = data.recurringConfigId && data.recurringConfigId.trim() !== "" ? data.recurringConfigId : null;
      const expense = await tx.branchExpense.create({
        data: {
          tenantId,
          branchId: data.branchId,
          financialAccountId: data.financialAccountId,
          recurringConfigId: configId,
          category: data.category,
          title: data.title.trim(),
          expenseMonth: data.expenseMonth,
          amount: data.amount,
          voucherNo: data.voucherNo?.trim() || null,
          reference: data.reference?.trim() || null,
          notes: data.notes?.trim() || null,
          recordedById: userId,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : /* @__PURE__ */ new Date()
        },
        include: {
          financialAccount: true,
          branch: true
        }
      });
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          sourceAccountId: data.financialAccountId,
          amount: data.amount,
          type: "EXPENSE",
          reference: data.voucherNo || data.reference || expense.id,
          note: `[Expense: ${data.category.replace(/_/g, " ")}] ${data.title} (${data.expenseMonth}) paid from ${account.name}`,
          userId
        }
      });
      await AuditService.log({
        tenantId,
        branchId: data.branchId,
        userId,
        action: "EXPENSE_RECORDED",
        details: {
          expenseId: expense.id,
          branchId: data.branchId,
          category: data.category,
          title: data.title,
          amount: data.amount,
          account: account.name,
          month: data.expenseMonth
        }
      });
      return expense;
    });
  }
  static async getExpenseSummary(tenantId, branchId, month) {
    const where = { tenantId };
    if (branchId) where.branchId = branchId;
    if (month) where.expenseMonth = month;
    const expenses = await prisma.branchExpense.findMany({
      where,
      select: {
        category: true,
        title: true,
        amount: true,
        recurringConfigId: true
      }
    });
    let shopRent = 0;
    let electricityBill = 0;
    let employeeSalary = 0;
    let otherExpenses = 0;
    let totalExpenses = 0;
    const categoryBreakdown = {};
    const billWiseBreakdown = {};
    for (const exp of expenses) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + amt;
      if (exp.category === "SHOP_RENT") shopRent += amt;
      else if (exp.category === "ELECTRICITY_BILL") electricityBill += amt;
      else if (exp.category === "EMPLOYEE_SALARY") employeeSalary += amt;
      else otherExpenses += amt;
      const key = exp.title.trim();
      if (!billWiseBreakdown[key]) {
        billWiseBreakdown[key] = { title: exp.title, category: exp.category, totalAmount: 0, count: 0 };
      }
      billWiseBreakdown[key].totalAmount += amt;
      billWiseBreakdown[key].count += 1;
    }
    return {
      shopRent,
      electricityBill,
      employeeSalary,
      otherExpenses,
      totalExpenses,
      categoryBreakdown,
      billWiseBreakdown: Object.values(billWiseBreakdown),
      count: expenses.length
    };
  }
  // ==========================================
  // 👥 STAFF SALARY MANAGEMENT & PAYROLL
  // ==========================================
  static async listBranchStaffSalaries(tenantId, branchId, month = "", includeInactive = false) {
    const where = {
      tenantId,
      role: {
        notIn: ["COMPANY_OWNER", "SUPER_ADMIN"]
      }
    };
    if (branchId && branchId !== "all" && branchId !== "all-branches") {
      where.branchId = branchId;
    }
    if (!includeInactive) {
      where.isActive = true;
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
        avatarUrl: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        salaryConfig: true,
        isActive: true,
        resignationDate: true,
        resignationReason: true,
        deactivatedAt: true,
        salaryDisbursements: {
          where: { month },
          include: {
            financialAccount: { select: { id: true, name: true, type: true } },
            disbursedBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { paymentDate: "desc" }
        }
      },
      orderBy: [{ name: "asc" }, { username: "asc" }]
    });
    return Promise.all(
      users.map(async (u) => {
        let calc = null;
        try {
          calc = await AttendanceService.calculateMonthlySalary(tenantId, branchId, u.id, month);
        } catch {
        }
        const config = u.salaryConfig;
        const baseSalary = calc ? calc.metrics.baseSalary : Number(config?.baseSalary || 0);
        const allowances = calc ? calc.metrics.totalAllowances : Number(config?.allowances || 0);
        const deductions = calc ? calc.metrics.totalDeductions : Number(config?.deductions || 0);
        const netSalary = calc ? calc.metrics.finalPayable : Number(config?.netSalary || baseSalary + allowances - deductions);
        const disbursements = u.salaryDisbursements || [];
        const paidAmount = disbursements.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
        const dueAmount = Math.max(0, Number((netSalary - paidAmount).toFixed(2)));
        let status = "DUE";
        if (netSalary > 0 && paidAmount >= netSalary) {
          status = "PAID";
        } else if (paidAmount > 0) {
          status = "PARTIAL";
        } else {
          status = "DUE";
        }
        return {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          phone: u.phone,
          role: u.role,
          customRoleName: u.customRoleName,
          pharmacyRoleName: u.pharmacyRoleName,
          avatarUrl: u.avatarUrl,
          branchId: u.branchId,
          branchName: u.branch?.name,
          createdAt: u.createdAt,
          isActive: u.isActive,
          resignationDate: u.resignationDate,
          resignationReason: u.resignationReason,
          deactivatedAt: u.deactivatedAt,
          salaryConfig: config ? {
            id: config.id,
            baseSalary,
            allowances,
            deductions,
            netSalary,
            paymentMethod: config.paymentMethod,
            paymentDetails: config.paymentDetails,
            effectiveDate: config.effectiveDate,
            notes: config.notes
          } : null,
          attendanceMetrics: calc?.metrics || null,
          monthStatus: {
            month,
            baseSalary,
            workingDays: calc?.metrics?.totalWorkingDays ?? 0,
            offDays: calc?.metrics?.offDays ?? 0,
            totalDays: calc?.metrics?.totalDays ?? 0,
            presentDays: calc?.metrics?.presentDays ?? 0,
            absentDays: calc?.metrics?.absentDays ?? 0,
            unpaidLeaveDays: calc?.metrics?.unpaidLeaveDays ?? 0,
            paidLeaveDays: calc?.metrics?.paidLeaveDays ?? 0,
            dailyRate: calc?.metrics?.dailyRate ?? 0,
            attendanceDeduction: calc?.metrics?.attendanceDeduction ?? 0,
            totalAllowances: calc?.metrics?.totalAllowances ?? 0,
            netSalary,
            paidAmount,
            dueAmount,
            status,
            disbursements
          }
        };
      })
    );
  }
  static async setSalaryConfig(tenantId, data) {
    const netSalary = data.baseSalary + (data.allowances || 0) - (data.deductions || 0);
    const user = await prisma.user.findFirst({
      where: { id: data.userId, tenantId }
    });
    if (!user) throw new Error("Staff member not found in this pharmacy.");
    return prisma.employeeSalaryConfig.upsert({
      where: { userId: data.userId },
      update: {
        branchId: data.branchId,
        baseSalary: data.baseSalary,
        allowances: data.allowances || 0,
        deductions: data.deductions || 0,
        netSalary,
        paymentMethod: data.paymentMethod || null,
        paymentDetails: data.paymentDetails?.trim() || null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        notes: data.notes?.trim() || null
      },
      create: {
        tenantId,
        branchId: data.branchId,
        userId: data.userId,
        baseSalary: data.baseSalary,
        allowances: data.allowances || 0,
        deductions: data.deductions || 0,
        netSalary,
        paymentMethod: data.paymentMethod || null,
        paymentDetails: data.paymentDetails?.trim() || null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        notes: data.notes?.trim() || null
      }
    });
  }
  static async disburseSalary(tenantId, disbursedById, data) {
    const employee = await prisma.user.findFirst({
      where: { id: data.userId, tenantId, branchId: data.branchId },
      include: { salaryConfig: true }
    });
    if (!employee) throw new Error("Employee not found in this branch.");
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.financialAccountId, branchId: data.branchId, tenantId, isActive: true }
    });
    if (!account) throw new Error("Invalid or inactive financial account selected for salary payment.");
    if (Number(account.balance) < data.paidAmount) {
      throw new Error(
        `Insufficient balance in account "${account.name}". Current Balance: \u09F3${Number(account.balance).toLocaleString()}, Required: \u09F3${data.paidAmount.toLocaleString()}`
      );
    }
    let calc = null;
    try {
      calc = await AttendanceService.calculateMonthlySalary(tenantId, data.branchId, data.userId, data.month);
    } catch (e) {
      console.error("Attendance calculation error during disbursement", e);
    }
    const config = employee.salaryConfig;
    const baseAmount = calc ? calc.metrics.baseSalary : Number(config?.baseSalary || data.paidAmount);
    const allowances = calc ? calc.metrics.totalAllowances : Number(config?.allowances || 0);
    const deductions = calc ? calc.metrics.totalDeductions : Number(config?.deductions || 0);
    const netPayable = calc ? calc.metrics.finalPayable : Number(config?.netSalary || baseAmount + allowances - deductions);
    const previousDisbursements = await prisma.salaryDisbursement.findMany({
      where: { tenantId, userId: data.userId, month: data.month }
    });
    const priorPaid = previousDisbursements.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
    const totalPaidNow = priorPaid + data.paidAmount;
    const dueAmount = Math.max(0, Number((netPayable - totalPaidNow).toFixed(2)));
    const status = dueAmount === 0 ? "PAID" : "PARTIAL";
    return prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({
        where: { id: data.financialAccountId },
        data: {
          balance: { decrement: data.paidAmount }
        }
      });
      const disbursement = await tx.salaryDisbursement.create({
        data: {
          tenantId,
          branchId: data.branchId,
          userId: data.userId,
          financialAccountId: data.financialAccountId,
          month: data.month,
          baseAmount,
          allowances,
          deductions,
          netPayable,
          paidAmount: data.paidAmount,
          dueAmount,
          status,
          totalDays: calc?.metrics.totalDays ?? null,
          offDays: calc?.metrics.offDays ?? null,
          workingDays: calc?.metrics.totalWorkingDays ?? null,
          presentDays: calc?.metrics.presentDays ?? null,
          absentDays: calc?.metrics.absentDays ?? null,
          paidLeaveDays: calc?.metrics.paidLeaveDays ?? null,
          unpaidLeaveDays: calc?.metrics.unpaidLeaveDays ?? null,
          dailyRate: calc?.metrics.dailyRate ?? null,
          attendanceDeduction: calc?.metrics.attendanceDeduction ?? null,
          allowanceBreakdown: calc?.monthlyAllowances ?? null,
          paymentRef: data.paymentRef?.trim() || null,
          notes: data.notes?.trim() || null,
          disbursedById,
          paymentDate: /* @__PURE__ */ new Date()
        },
        include: {
          financialAccount: true,
          user: true
        }
      });
      await tx.branchExpense.create({
        data: {
          tenantId,
          branchId: data.branchId,
          financialAccountId: data.financialAccountId,
          category: "EMPLOYEE_SALARY",
          title: `Salary - ${employee.name || employee.username}`,
          expenseMonth: data.month,
          amount: data.paidAmount,
          voucherNo: data.paymentRef || disbursement.id,
          notes: `Monthly payroll payment for ${data.month}`,
          recordedById: disbursedById,
          paymentDate: /* @__PURE__ */ new Date()
        }
      });
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: data.branchId,
          sourceAccountId: data.financialAccountId,
          amount: data.paidAmount,
          type: "EXPENSE",
          reference: data.paymentRef || disbursement.id,
          note: `[Salary Payment] ${employee.name || employee.username} for ${data.month} paid from ${account.name}`,
          userId: disbursedById
        }
      });
      await AuditService.log({
        tenantId,
        branchId: data.branchId,
        userId: disbursedById,
        action: "SALARY_DISBURSED",
        details: {
          disbursementId: disbursement.id,
          employeeId: data.userId,
          employeeName: employee.name || employee.username,
          month: data.month,
          paidAmount: data.paidAmount,
          account: account.name
        }
      });
      return disbursement;
    });
  }
  static async getEmployeeSalaryHistory(tenantId, userId, requestingUser) {
    const employee = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
        avatarUrl: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
        salaryConfig: true
      }
    });
    if (!employee) throw new Error("Employee not found.");
    if (requestingUser) {
      const isOwnerOrAdmin = requestingUser.role === "COMPANY_OWNER" || requestingUser.role === "SUPER_ADMIN" || requestingUser.role === "REGIONAL_ADMIN";
      const isBranchManager = requestingUser.role === "BRANCH_MANAGER" || requestingUser.pharmacyRoleName?.toLowerCase().includes("branch manager") || requestingUser.customRoleName?.toLowerCase().includes("branch manager");
      if (isBranchManager && !isOwnerOrAdmin) {
        const reqBranchId = requestingUser.branchId;
        if (reqBranchId && employee.branchId && employee.branchId !== reqBranchId) {
          throw new Error("Access denied: You can only view details of employees assigned to your branch.");
        }
      }
    }
    const disbursements = await prisma.salaryDisbursement.findMany({
      where: { tenantId, userId },
      orderBy: { paymentDate: "desc" },
      include: {
        financialAccount: { select: { id: true, name: true, type: true, accountNumber: true, bankName: true } },
        disbursedBy: { select: { id: true, name: true, username: true } },
        branch: { select: { id: true, name: true } }
      }
    });
    const totalDisbursed = disbursements.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
    return {
      employee,
      disbursements,
      summary: {
        totalDisbursed,
        totalPayments: disbursements.length
      }
    };
  }
  static async getMySalaryHistory(tenantId, userId) {
    return this.getEmployeeSalaryHistory(tenantId, userId);
  }
  static async getBranchSalaryHistory(tenantId, branchId, query) {
    const where = { tenantId };
    if (branchId) where.branchId = branchId;
    if (query?.month) where.month = query.month;
    if (query?.userId) where.userId = query.userId;
    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.salaryDisbursement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              phone: true,
              role: true,
              customRoleName: true,
              pharmacyRoleName: true
            }
          },
          financialAccount: {
            select: { id: true, name: true, type: true, accountNumber: true, bankName: true }
          },
          disbursedBy: {
            select: { id: true, name: true, username: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.salaryDisbursement.count({ where })
    ]);
    const totalDisbursed = items.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
    return {
      items,
      totalDisbursed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

// src/modules/accounting/accounting.controller.ts
var AccountingController = class {
  static async listAccounts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const user = req.user;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner ? req.query.branchId || req.headers["x-branch-id"] || void 0 : user.branchId || void 0;
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? void 0 : branchId;
      const accounts = await AccountingService.listAccounts(tenantId, cleanBranchId);
      res.json({ success: true, data: accounts });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async createAccount(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const account = await AccountingService.createAccount(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: account });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async updateAccount(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const accountId = req.params.id;
      const account = await AccountingService.updateAccount(tenantId, accountId, userId, req.body);
      res.status(200).json({ success: true, data: account, message: "Account updated successfully" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async deleteAccount(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const accountId = req.params.id;
      await AccountingService.deleteAccount(tenantId, accountId, userId);
      res.status(200).json({ success: true, message: "Financial account removed successfully" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async depositFunds(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const account = await AccountingService.depositFunds(tenantId, userId, req.body);
      res.json({
        success: true,
        message: `Successfully deposited funds into ${account.name}`,
        data: account
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async transferFunds(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await AccountingService.transferFunds(tenantId, userId, req.body);
      res.json({
        success: true,
        message: "Funds transferred successfully",
        data: result
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async recordTransaction(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const result = await AccountingService.recordIncomeExpense(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Financial transaction recorded successfully",
        data: result
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async listTransactions(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const result = await AccountingService.listTransactions(tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getOverview(req, res) {
    try {
      const user = req.user;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner ? req.query.branchId || req.headers["x-branch-id"] || void 0 : user.branchId || void 0;
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? void 0 : branchId;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        period: req.query.period
      };
      const overview = await AccountingService.getFinancialOverview(tenantId, cleanBranchId, options);
      res.json({ success: true, data: overview });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getDailySales(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userBranchId = req.user.branchId;
      const query = req.query;
      const report = await ReportService.getDailySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // ==========================================
  // 🏢 RECURRING EXPENSES
  // ==========================================
  static async listRecurringExpenses(req, res) {
    try {
      const user = req.user;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner ? req.query.branchId || req.headers["x-branch-id"] || void 0 : user.branchId || void 0;
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? void 0 : branchId;
      const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
      const data = await AccountingService.listRecurringExpenses(tenantId, cleanBranchId, includeInactive);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async createRecurringExpense(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const data = await AccountingService.createRecurringExpense(tenantId, req.body);
      res.status(201).json({ success: true, data, message: "Recurring bill configured successfully" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async updateRecurringExpense(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const data = await AccountingService.updateRecurringExpense(tenantId, req.params.id, req.body);
      res.json({ success: true, data, message: "Recurring bill updated successfully" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async deleteRecurringExpense(req, res) {
    try {
      const tenantId = req.user.tenantId;
      await AccountingService.deleteRecurringExpense(tenantId, req.params.id);
      res.json({ success: true, message: "Recurring bill removed" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  // ==========================================
  // 💸 ACTUAL MONTHLY EXPENSE PAYMENTS
  // ==========================================
  static async listExpenses(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const result = await AccountingService.listExpenses(tenantId, req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async recordExpense(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const expense = await AccountingService.recordExpense(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: expense, message: "Expense payment recorded and account debited" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getExpenseSummary(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.query.branchId;
      const month = req.query.month;
      const summary = await AccountingService.getExpenseSummary(tenantId, branchId, month);
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  // ==========================================
  // 👥 STAFF SALARY MANAGEMENT
  // ==========================================
  static async listBranchStaffSalaries(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const user = req.user;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner ? req.query.branchId || req.headers["x-branch-id"] || void 0 : user.branchId || void 0;
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? void 0 : branchId;
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
      const employees = await AccountingService.listBranchStaffSalaries(tenantId, cleanBranchId, month, includeInactive);
      res.json({ success: true, data: employees });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async setSalaryConfig(req, res) {
    try {
      const user = req.user;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const isBranchManager = user.role === "BRANCH_MANAGER" || user.pharmacyRoleName?.toLowerCase().includes("branch manager") || user.customRoleName?.toLowerCase().includes("branch manager") || user.permissions?.includes("salaries.base_salary.edit") || user.permissions?.includes("accounts.salaries") || user.permissions?.includes("*");
      if (!isOwner && !isBranchManager) {
        const existing = await prisma.employeeSalaryConfig.findUnique({
          where: {
            tenantId_userId: {
              tenantId,
              userId: req.body.userId
            }
          }
        });
        const incomingBase = Number(req.body.baseSalary);
        if (existing && existing.baseSalary !== incomingBase) {
          res.status(403).json({
            success: false,
            message: "Forbidden: Only Pharmacy Owner and Branch Manager can set or update Base Salary."
          });
          return;
        }
      }
      const branchId = isOwner ? req.body.branchId || user.branchId : user.branchId || req.body.branchId;
      const result = await AccountingService.setSalaryConfig(tenantId, {
        ...req.body,
        branchId
      });
      res.json({ success: true, message: "Salary configuration saved successfully", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async disburseSalary(req, res) {
    try {
      const user = req.user;
      const tenantId = user.tenantId;
      const disbursedById = user.id;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const branchId = isOwner ? req.body.branchId || user.branchId || "" : user.branchId || req.body.branchId || "";
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const payload = {
        ...req.body,
        branchId
      };
      const result = await AccountingService.disburseSalary(tenantId, disbursedById, payload);
      res.status(201).json({ success: true, data: result, message: "Salary paid successfully and financial account debited" });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getBranchSalaryHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const user = req.user;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner ? req.query.branchId || req.headers["x-branch-id"] || void 0 : user.branchId || void 0;
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? void 0 : branchId;
      const month = req.query.month;
      const userId = req.query.userId;
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const data = await AccountingService.getBranchSalaryHistory(tenantId, cleanBranchId, {
        month,
        userId,
        page,
        limit
      });
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getEmployeeSalaryHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.params.userId;
      const user = req.user;
      const actorRole = user.role;
      const isManagerOrAccounts = actorRole === "COMPANY_OWNER" || actorRole === "SUPER_ADMIN" || actorRole === "REGIONAL_ADMIN" || actorRole === "BRANCH_MANAGER" || actorRole === "ACCOUNTS" || user.pharmacyRoleName?.toLowerCase().includes("branch manager") || user.customRoleName?.toLowerCase().includes("branch manager");
      if (!isManagerOrAccounts && user.id !== userId) {
        res.status(403).json({ success: false, message: "Forbidden: You can only view your own salary history." });
        return;
      }
      const history = await AccountingService.getEmployeeSalaryHistory(tenantId, userId, user);
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getMySalaryHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const history = await AccountingService.getMySalaryHistory(tenantId, userId);
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};

// src/modules/accounting/accounting.validation.ts
import { z as z18 } from "zod";
var createAccountSchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  name: z18.string().min(2, "Account name must be at least 2 characters"),
  type: z18.enum(["CASH", "BANK", "BKASH", "NAGAD", "MOBILE", "CARD_SETTLEMENT", "OTHER"]),
  accountNumber: z18.string().optional().nullable(),
  bankName: z18.string().optional().nullable(),
  branchName: z18.string().optional().nullable(),
  routingNumber: z18.string().optional().nullable(),
  isDefault: z18.boolean().optional().default(false),
  description: z18.string().optional().nullable(),
  initialBalance: z18.number().nonnegative().optional().default(0)
});
var updateAccountSchema = z18.object({
  name: z18.string().min(2).optional(),
  accountNumber: z18.string().optional().nullable(),
  bankName: z18.string().optional().nullable(),
  branchName: z18.string().optional().nullable(),
  routingNumber: z18.string().optional().nullable(),
  isDefault: z18.boolean().optional(),
  description: z18.string().optional().nullable(),
  isActive: z18.boolean().optional()
});
var depositFundsSchema = z18.object({
  accountId: z18.string().uuid("Invalid account ID"),
  amount: z18.number().positive("Deposit amount must be greater than 0"),
  description: z18.string().optional().nullable()
});
var transferFundsSchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  sourceAccountId: z18.string().uuid("Invalid source account ID"),
  destinationAccountId: z18.string().uuid("Invalid destination account ID"),
  amount: z18.number().positive("Transfer amount must be greater than 0"),
  reference: z18.string().optional(),
  note: z18.string().optional()
});
var recordTransactionSchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  accountId: z18.string().uuid("Invalid account ID"),
  amount: z18.number().positive("Amount must be greater than 0"),
  type: z18.enum(["INCOME", "EXPENSE", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"]),
  reference: z18.string().optional(),
  note: z18.string().optional()
});
var listTransactionsQuerySchema = z18.object({
  branchId: z18.string().uuid().optional(),
  accountId: z18.string().uuid().optional(),
  type: z18.enum(["INCOME", "EXPENSE", "TRANSFER", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"]).optional(),
  startDate: z18.string().datetime().optional().or(z18.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z18.string().datetime().optional().or(z18.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  page: z18.coerce.number().int().positive().optional().default(1),
  limit: z18.coerce.number().int().positive().max(100).optional().default(20)
});
var createRecurringExpenseSchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  category: z18.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().default("OTHER"),
  title: z18.string().min(1, "Bill name is required"),
  estimatedAmount: z18.number().nonnegative().optional().default(0),
  dueDay: z18.number().int().min(1).max(31).optional().nullable(),
  notes: z18.string().optional().nullable()
});
var updateRecurringExpenseSchema = z18.object({
  category: z18.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional(),
  title: z18.string().min(1, "Bill name is required").optional(),
  estimatedAmount: z18.number().nonnegative().optional(),
  dueDay: z18.number().int().min(1).max(31).optional().nullable(),
  notes: z18.string().optional().nullable(),
  isActive: z18.boolean().optional()
});
var recordExpensePaymentSchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  financialAccountId: z18.string().uuid("Invalid financial account ID"),
  recurringConfigId: z18.string().uuid().optional().nullable().or(z18.literal("")),
  category: z18.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().default("OTHER"),
  title: z18.string().min(1, "Expense title is required"),
  expenseMonth: z18.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  amount: z18.number().positive("Amount must be greater than 0"),
  voucherNo: z18.string().optional().nullable(),
  reference: z18.string().optional().nullable(),
  notes: z18.string().optional().nullable(),
  paymentDate: z18.string().optional()
  // ISO date string optional, defaults to now
});
var listExpensesQuerySchema = z18.object({
  branchId: z18.string().uuid().optional().or(z18.literal("")),
  category: z18.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().or(z18.literal("")),
  recurringConfigId: z18.string().uuid().optional().or(z18.literal("")),
  financialAccountId: z18.string().uuid().optional().or(z18.literal("")),
  expenseMonth: z18.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().or(z18.literal("")),
  startDate: z18.string().optional().or(z18.literal("")),
  endDate: z18.string().optional().or(z18.literal("")),
  page: z18.coerce.number().int().positive().optional().default(1),
  limit: z18.coerce.number().int().positive().max(500).optional().default(100)
});
var setSalaryConfigSchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  userId: z18.string().uuid("Invalid user/employee ID"),
  baseSalary: z18.number().nonnegative("Base salary cannot be negative"),
  allowances: z18.number().nonnegative().optional().default(0),
  deductions: z18.number().nonnegative().optional().default(0),
  paymentMethod: z18.string().optional().nullable(),
  paymentDetails: z18.string().optional().nullable(),
  effectiveDate: z18.string().optional().nullable(),
  notes: z18.string().optional().nullable()
});
var disburseSalarySchema = z18.object({
  branchId: z18.string().uuid("Invalid branch ID"),
  userId: z18.string().uuid("Invalid employee ID"),
  financialAccountId: z18.string().uuid("Invalid financial account ID"),
  month: z18.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  paidAmount: z18.number().positive("Payment amount must be greater than 0"),
  paymentRef: z18.string().optional().nullable(),
  notes: z18.string().optional().nullable()
});

// src/modules/accounting/accounting.routes.ts
var router19 = Router19();
router19.use(authenticate, requireActiveSubscription);
router19.get(
  "/overview",
  requirePermission("accounts.view"),
  AccountingController.getOverview
);
router19.get(
  "/accounts",
  requirePermission("accounts.view"),
  AccountingController.listAccounts
);
router19.post(
  "/accounts",
  requirePermission("accounts.manage"),
  validateRequest({ body: createAccountSchema }),
  AccountingController.createAccount
);
router19.patch(
  "/accounts/:id",
  requirePermission("accounts.manage"),
  validateRequest({ body: updateAccountSchema }),
  AccountingController.updateAccount
);
router19.post(
  "/accounts/deposit",
  requirePermission("accounts.manage"),
  validateRequest({ body: depositFundsSchema }),
  AccountingController.depositFunds
);
router19.delete(
  "/accounts/:id",
  requirePermission("accounts.manage"),
  AccountingController.deleteAccount
);
router19.post(
  "/transfer",
  requirePermission("accounts.transfer"),
  validateRequest({ body: transferFundsSchema }),
  AccountingController.transferFunds
);
router19.post(
  "/transactions",
  requirePermission("accounts.manage"),
  validateRequest({ body: recordTransactionSchema }),
  AccountingController.recordTransaction
);
router19.get(
  "/transactions",
  requirePermission("accounts.view"),
  validateRequest({ query: listTransactionsQuerySchema }),
  AccountingController.listTransactions
);
router19.get(
  "/daily-sales",
  requirePermission("accounts.view"),
  AccountingController.getDailySales
);
router19.get(
  "/recurring-expenses",
  requirePermission("expenses.list"),
  AccountingController.listRecurringExpenses
);
router19.post(
  "/recurring-expenses",
  requirePermission("expenses.list"),
  validateRequest({ body: createRecurringExpenseSchema }),
  AccountingController.createRecurringExpense
);
router19.put(
  "/recurring-expenses/:id",
  requirePermission("expenses.list"),
  validateRequest({ body: updateRecurringExpenseSchema }),
  AccountingController.updateRecurringExpense
);
router19.delete(
  "/recurring-expenses/:id",
  requirePermission("expenses.list"),
  AccountingController.deleteRecurringExpense
);
router19.get(
  "/expenses",
  requirePermission("expenses.history"),
  validateRequest({ query: listExpensesQuerySchema }),
  AccountingController.listExpenses
);
router19.post(
  "/expenses",
  requirePermission("expenses.pay"),
  validateRequest({ body: recordExpensePaymentSchema }),
  AccountingController.recordExpense
);
router19.get(
  "/expenses/summary",
  requirePermission("expenses.history"),
  AccountingController.getExpenseSummary
);
router19.get(
  "/salaries/employees",
  requirePermission("employee.view"),
  AccountingController.listBranchStaffSalaries
);
router19.post(
  "/salaries/config",
  requirePermission("salary.manage"),
  validateRequest({ body: setSalaryConfigSchema }),
  AccountingController.setSalaryConfig
);
router19.post(
  "/salaries/disburse",
  requirePermission("salary.manage"),
  validateRequest({ body: disburseSalarySchema }),
  AccountingController.disburseSalary
);
router19.get(
  "/salaries/branch-history",
  requirePermission("salary.history"),
  AccountingController.getBranchSalaryHistory
);
router19.get(
  "/salaries/history/:userId",
  requirePermission("salary.history"),
  AccountingController.getEmployeeSalaryHistory
);
router19.get(
  "/salaries/my-history",
  AccountingController.getMySalaryHistory
);
var accountingRoutes = router19;

// src/modules/attendance/attendance.routes.ts
import { Router as Router20 } from "express";

// src/modules/attendance/attendance.controller.ts
var AttendanceController = class _AttendanceController {
  static resolveBranchId(req) {
    const userRole = req.user.role;
    const userBranchId = req.user.branchId;
    const queryBranchId = req.query.branchId || req.body?.branchId;
    if (userRole === "COMPANY_OWNER" || userRole === "SUPER_ADMIN" || userRole === "REGIONAL_ADMIN") {
      return queryBranchId || userBranchId || "";
    }
    return userBranchId || queryBranchId || "";
  }
  static async getOffDays(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const result = await AttendanceService.getBranchOffDayConfig(tenantId, branchId, month);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async setOffDays(req, res) {
    try {
      const user = req.user;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const isBranchManager = user.role === "BRANCH_MANAGER" || user.pharmacyRoleName?.toLowerCase().includes("branch manager") || user.customRoleName?.toLowerCase().includes("branch manager") || user.permissions?.includes("attendance.manage") || user.permissions?.includes("*");
      if (!isOwner && !isBranchManager) {
        res.status(403).json({ success: false, message: "Forbidden: Only Branch Manager and Pharmacy Owner can configure monthly off-days." });
        return;
      }
      const tenantId = user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const actorId = user.id;
      const month = req.body.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const result = await AttendanceService.setBranchOffDayConfig(
        tenantId,
        branchId,
        month,
        {
          ...req.body,
          branchId
        },
        actorId
      );
      res.json({ success: true, message: "Monthly off-days configured successfully", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getDailySheet(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const sheet = await AttendanceService.getDailyAttendanceSheet(tenantId, branchId, date);
      res.json({ success: true, data: sheet });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async markBulkDaily(req, res) {
    try {
      const user = req.user;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const isBranchManager = user.role === "BRANCH_MANAGER" || user.pharmacyRoleName?.toLowerCase().includes("branch manager") || user.customRoleName?.toLowerCase().includes("branch manager") || user.permissions?.includes("attendance.manage") || user.permissions?.includes("*");
      if (!isOwner && !isBranchManager) {
        res.status(403).json({ success: false, message: "Forbidden: Only Branch Manager and Pharmacy Owner can mark employee attendance. Employees cannot mark their own attendance." });
        return;
      }
      const tenantId = user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const actorId = user.id;
      const date = req.body.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const result = await AttendanceService.markBulkDailyAttendance(
        tenantId,
        branchId,
        date,
        {
          ...req.body,
          branchId
        },
        actorId
      );
      res.json({ success: true, message: "Attendance marked successfully", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getEmployeeHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.query.userId || req.params.userId;
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      if (!userId) {
        res.status(400).json({ success: false, message: "User ID is required" });
        return;
      }
      const user = req.user;
      const actorRole = user.role;
      const isManagerOrAccounts = actorRole === "COMPANY_OWNER" || actorRole === "SUPER_ADMIN" || actorRole === "REGIONAL_ADMIN" || actorRole === "BRANCH_MANAGER" || actorRole === "ACCOUNTS" || user.pharmacyRoleName?.toLowerCase().includes("branch manager") || user.customRoleName?.toLowerCase().includes("branch manager") || user.permissions?.includes("attendance.manage") || user.permissions?.includes("accounts.salaries") || user.permissions?.includes("*");
      if (!isManagerOrAccounts && user.id !== userId) {
        res.status(403).json({ success: false, message: "Forbidden: You can only view your own attendance history." });
        return;
      }
      const history = await AttendanceService.getEmployeeAttendanceHistory(tenantId, userId, month, user);
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getMyHistory(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const history = await AttendanceService.getEmployeeAttendanceHistory(tenantId, userId, month);
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getSalaryCalc(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const userId = req.query.userId;
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      if (!branchId || !userId) {
        res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
        return;
      }
      const calc = await AttendanceService.calculateMonthlySalary(tenantId, branchId, userId, month);
      res.json({ success: true, data: calc });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async getBranchSummary(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const summary = await AttendanceService.getBranchMonthlyAttendanceSummary(tenantId, branchId, month);
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async listAllowances(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const userId = req.query.userId;
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      if (!branchId || !userId) {
        res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
        return;
      }
      const allowances = await AttendanceService.listEmployeeAllowances(tenantId, branchId, userId, month);
      res.json({ success: true, data: allowances });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async addAllowance(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const actorId = req.user.id;
      const { userId, month, title, amount, notes } = req.body;
      if (!branchId || !userId) {
        res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
        return;
      }
      const allowance = await AttendanceService.addEmployeeAllowance(
        tenantId,
        branchId,
        userId,
        month,
        { branchId, userId, month, title, amount: Number(amount), notes },
        actorId
      );
      res.status(201).json({ success: true, message: "Allowance added successfully", data: allowance });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async deleteAllowance(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const actorId = req.user.id;
      const allowanceId = req.params.id;
      const result = await AttendanceService.deleteEmployeeAllowance(tenantId, allowanceId, actorId);
      res.json({ success: true, message: "Allowance deleted successfully", data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async deactivateEmployee(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const actorId = req.user.id;
      const userId = req.params.id;
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const updated = await AttendanceService.deactivateEmployee(tenantId, branchId, userId, req.body, actorId);
      res.json({ success: true, message: "Employee deactivated / resigned successfully", data: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async reactivateEmployee(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = _AttendanceController.resolveBranchId(req);
      const actorId = req.user.id;
      const userId = req.params.id;
      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }
      const updated = await AttendanceService.reactivateEmployee(tenantId, branchId, userId, actorId);
      res.json({ success: true, message: "Employee reactivated successfully", data: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
};

// src/modules/attendance/deductionRule.controller.ts
var DeductionRuleController = class {
  static async getRules(req, res) {
    try {
      const { branchId } = req.query;
      const user = req.user;
      const tenantId = user.tenantId;
      if (!branchId || branchId === "all") {
        res.status(400).json({ success: false, message: "A specific branchId is required" });
        return;
      }
      const rule = await prisma.salaryDeductionRule.findUnique({
        where: { branchId: String(branchId) }
      });
      res.status(200).json({
        success: true,
        data: rule || { absentRuleRatio: null, lateRuleRatio: null }
      });
    } catch (error) {
      console.error("[DeductionRuleController.getRules] Error:", error.message);
      res.status(500).json({ success: false, message: "Failed to get deduction rules." });
    }
  }
  static async setRules(req, res) {
    try {
      const { branchId, absentRuleRatio, lateRuleRatio } = req.body;
      const user = req.user;
      const tenantId = user.tenantId;
      if (!branchId || branchId === "all") {
        res.status(400).json({ success: false, message: "A specific branchId is required" });
        return;
      }
      const parseRatio = (val) => {
        if (val === null || val === "" || val === void 0) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      };
      const parsedAbsent = parseRatio(absentRuleRatio);
      const parsedLate = parseRatio(lateRuleRatio);
      const rule = await prisma.salaryDeductionRule.upsert({
        where: { branchId: String(branchId) },
        update: {
          absentRuleRatio: parsedAbsent,
          lateRuleRatio: parsedLate
        },
        create: {
          tenantId,
          branchId: String(branchId),
          absentRuleRatio: parsedAbsent,
          lateRuleRatio: parsedLate,
          createdById: user.id
        }
      });
      await AuditService.log({
        tenantId,
        branchId: String(branchId),
        userId: user.id,
        action: "SALARY_DEDUCTION_RULE_UPDATED",
        details: { absentRuleRatio: parsedAbsent, lateRuleRatio: parsedLate }
      });
      res.status(200).json({
        success: true,
        message: "Salary deduction rules saved successfully",
        data: rule
      });
    } catch (error) {
      console.error("[DeductionRuleController.setRules] Error:", error.message);
      res.status(500).json({ success: false, message: "Failed to set deduction rules." });
    }
  }
};

// src/modules/attendance/attendance.validation.ts
import { z as z19 } from "zod";
var setBranchOffDayConfigSchema = z19.object({
  branchId: z19.string().uuid("Invalid branch ID"),
  month: z19.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  weeklyOffDays: z19.array(z19.string()).min(1, "At least one weekly off-day must be selected"),
  customOffDates: z19.array(z19.string()).optional().default([]),
  notes: z19.string().optional().nullable()
});
var attendanceItemSchema = z19.object({
  userId: z19.string().uuid("Invalid user ID"),
  status: z19.enum(["PRESENT", "ABSENT", "LATE", "PAID_LEAVE", "UNPAID_LEAVE", "OFF_DAY"]),
  notes: z19.string().optional().nullable()
});
var markBulkDailyAttendanceSchema = z19.object({
  branchId: z19.string().uuid("Invalid branch ID"),
  date: z19.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  attendances: z19.array(attendanceItemSchema).min(1, "At least one employee attendance record is required")
});
var createAllowanceSchema = z19.object({
  branchId: z19.string().uuid("Invalid branch ID"),
  userId: z19.string().uuid("Invalid employee user ID"),
  month: z19.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  title: z19.string().min(1, "Allowance title is required"),
  amount: z19.number().positive("Allowance amount must be greater than 0"),
  notes: z19.string().optional().nullable()
});
var deactivateEmployeeSchema = z19.object({
  resignationDate: z19.string().optional().nullable(),
  resignationReason: z19.string().optional().nullable(),
  notes: z19.string().optional().nullable()
});

// src/modules/attendance/attendance.routes.ts
var router20 = Router20();
router20.use(authenticate, requireActiveSubscription);
router20.get("/my-history", AttendanceController.getMyHistory);
router20.get(
  "/off-days",
  requirePermission("attendance.offdays"),
  AttendanceController.getOffDays
);
router20.post(
  "/off-days",
  requirePermission("attendance.offdays"),
  validateRequest({ body: setBranchOffDayConfigSchema }),
  AttendanceController.setOffDays
);
router20.get(
  "/daily",
  requirePermission("attendance.manage"),
  AttendanceController.getDailySheet
);
router20.post(
  "/daily",
  requirePermission("attendance.manage"),
  validateRequest({ body: markBulkDailyAttendanceSchema }),
  AttendanceController.markBulkDaily
);
router20.get(
  "/employee-history/:userId",
  requirePermission("attendance.manage"),
  AttendanceController.getEmployeeHistory
);
router20.get(
  "/employee-history",
  requirePermission("attendance.manage"),
  AttendanceController.getEmployeeHistory
);
router20.get(
  "/salary-calc",
  requirePermission("salary.manage"),
  AttendanceController.getSalaryCalc
);
router20.get(
  "/summary",
  requirePermission("attendance.manage"),
  AttendanceController.getBranchSummary
);
router20.get(
  "/allowances",
  requirePermission("salary.manage"),
  AttendanceController.listAllowances
);
router20.post(
  "/allowances",
  requirePermission("salary.manage"),
  validateRequest({ body: createAllowanceSchema }),
  AttendanceController.addAllowance
);
router20.delete(
  "/allowances/:id",
  requirePermission("salary.manage"),
  AttendanceController.deleteAllowance
);
router20.post(
  "/employees/:id/deactivate",
  requirePermission("employee.view"),
  validateRequest({ body: deactivateEmployeeSchema }),
  AttendanceController.deactivateEmployee
);
router20.post(
  "/employees/:id/reactivate",
  requirePermission("employee.view"),
  AttendanceController.reactivateEmployee
);
router20.get(
  "/deduction-rules",
  requirePermission("salary.deductions"),
  DeductionRuleController.getRules
);
router20.put(
  "/deduction-rules",
  requirePermission("salary.deductions"),
  DeductionRuleController.setRules
);
var attendanceRoutes = router20;

// src/modules/location/location.routes.ts
import { Router as Router21 } from "express";

// src/modules/location/location.service.ts
var LocationService = class {
  /**
   * Get all racks with nested shelves and bins for a branch.
   * If includeInactive is false, only active items are returned.
   * Also computes usedLocations, emptyLocations, and active stock counts.
   */
  static async getRacks(branchId, includeInactive = false) {
    const where = { branchId };
    if (!includeInactive) {
      where.isActive = true;
    }
    const shelfWhere = {};
    if (!includeInactive) {
      shelfWhere.isActive = true;
    }
    const binWhere = {};
    if (!includeInactive) {
      binWhere.isActive = true;
    }
    const racks = await prisma.rack.findMany({
      where,
      include: {
        shelves: {
          where: shelfWhere,
          include: {
            bins: {
              where: binWhere,
              orderBy: { name: "asc" }
            }
          },
          orderBy: { name: "asc" }
        },
        inventoryLocations: {
          where: { quantity: { gt: 0 } },
          include: {
            inventory: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, unit: true, stripsPerBox: true, tabletsPerStrip: true }
                }
              }
            },
            rack: { select: { id: true, name: true } },
            shelf: { select: { id: true, name: true } },
            bin: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: "asc" }
    });
    return racks.map((rack) => {
      const numberOfShelves = rack.shelves ? rack.shelves.length : 0;
      let numberOfBins = 0;
      for (const s of rack.shelves || []) {
        numberOfBins += s.bins ? s.bins.length : 0;
      }
      const usedBinIds = /* @__PURE__ */ new Set();
      let totalStockUnits = 0;
      for (const loc of rack.inventoryLocations || []) {
        if (loc.binId) usedBinIds.add(loc.binId);
        totalStockUnits += loc.quantity || 0;
      }
      const usedLocations = usedBinIds.size;
      const emptyLocations = Math.max(0, numberOfBins - usedLocations);
      return {
        ...rack,
        numberOfShelves,
        numberOfBins,
        usedLocations,
        emptyLocations,
        totalStockUnits
      };
    });
  }
  static async quickCreateRack(branchId, data) {
    const rackName = data.name.trim();
    const numberOfShelves = Math.max(1, Math.min(50, data.numberOfShelves));
    const binsPerShelf = Math.max(1, Math.min(50, data.binsPerShelf));
    const isActive = data.isActive ?? true;
    const existing = await prisma.rack.findFirst({
      where: {
        branchId,
        name: { equals: rackName, mode: "insensitive" }
      }
    });
    if (existing) {
      throw new Error(`A rack with name "${rackName}" already exists in this branch. Please choose a different name.`);
    }
    const shelvesData = Array.from({ length: numberOfShelves }, (_, s) => {
      const sIdx = s + 1;
      const shelfNum = sIdx < 10 ? `S0${sIdx}` : `S${sIdx}`;
      return {
        name: shelfNum,
        isActive,
        bins: {
          create: Array.from({ length: binsPerShelf }, (_2, b) => {
            const bIdx = b + 1;
            const binNum = bIdx < 10 ? `B0${bIdx}` : `B${bIdx}`;
            return {
              name: binNum,
              isActive
            };
          })
        }
      };
    });
    const rack = await prisma.rack.create({
      data: {
        branchId,
        name: rackName,
        isActive,
        shelves: {
          create: shelvesData
        }
      },
      include: {
        shelves: {
          include: {
            bins: {
              orderBy: { name: "asc" }
            }
          },
          orderBy: { name: "asc" }
        }
      }
    });
    const totalBins = rack.shelves.reduce(
      (acc, s) => acc + (s.bins ? s.bins.length : 0),
      0
    );
    return {
      ...rack,
      numberOfShelves: rack.shelves.length,
      numberOfBins: totalBins,
      usedLocations: 0,
      emptyLocations: totalBins,
      totalStockUnits: 0
    };
  }
  static async createRack(branchId, data) {
    const rackName = data.name.trim();
    const existing = await prisma.rack.findFirst({
      where: {
        branchId,
        name: { equals: rackName, mode: "insensitive" }
      }
    });
    if (existing) {
      throw new Error(`A rack with name "${rackName}" already exists in this branch. Please choose a different name.`);
    }
    return prisma.rack.create({
      data: {
        branchId,
        name: rackName,
        isActive: data.isActive ?? true
      },
      include: {
        shelves: {
          include: { bins: true }
        }
      }
    });
  }
  static async updateRack(id, data) {
    const updateData = {};
    if (data.name !== void 0) updateData.name = data.name.trim();
    if (data.isActive !== void 0) updateData.isActive = data.isActive;
    return prisma.rack.update({
      where: { id },
      data: updateData,
      include: {
        shelves: {
          include: { bins: true }
        }
      }
    });
  }
  static async deleteRack(id) {
    const activeStock = await prisma.inventoryLocation.findFirst({
      where: {
        rackId: id,
        quantity: { gt: 0 }
      },
      include: {
        inventory: {
          include: { product: { select: { name: true } } }
        }
      }
    });
    if (activeStock) {
      throw new Error(
        `Cannot delete Rack: Active stock (${activeStock.quantity} units of ${activeStock.inventory?.product?.name || "medicine"}) is still stored in this rack. Please move the stock to another location first.`
      );
    }
    const rackLocs = await prisma.inventoryLocation.findMany({
      where: { rackId: id },
      select: { id: true }
    });
    const locIds = rackLocs.map((l) => l.id);
    if (locIds.length > 0) {
      const movementHistory = await prisma.stockMovement.findFirst({
        where: {
          OR: [
            { fromLocationId: { in: locIds } },
            { toLocationId: { in: locIds } }
          ]
        }
      });
      if (movementHistory) {
        throw new Error(
          "Cannot delete Rack: This rack has stock movement audit records. Please deactivate it instead of deleting to preserve inventory history."
        );
      }
    }
    return prisma.$transaction(async (tx) => {
      await tx.inventoryLocation.deleteMany({
        where: { rackId: id }
      });
      const shelves = await tx.shelf.findMany({ where: { rackId: id }, select: { id: true } });
      const shelfIds = shelves.map((s) => s.id);
      if (shelfIds.length > 0) {
        await tx.inventoryLocation.deleteMany({
          where: { shelfId: { in: shelfIds } }
        });
        const bins = await tx.bin.findMany({ where: { shelfId: { in: shelfIds } }, select: { id: true } });
        const binIds = bins.map((b) => b.id);
        if (binIds.length > 0) {
          await tx.inventoryLocation.deleteMany({
            where: { binId: { in: binIds } }
          });
          await tx.bin.deleteMany({ where: { id: { in: binIds } } });
        }
        await tx.shelf.deleteMany({ where: { id: { in: shelfIds } } });
      }
      return tx.rack.delete({ where: { id } });
    });
  }
  static async createShelf(data) {
    return prisma.shelf.create({
      data: {
        rackId: data.rackId,
        name: data.name.trim(),
        isActive: data.isActive ?? true
      },
      include: { bins: true }
    });
  }
  static async updateShelf(id, data) {
    const updateData = {};
    if (data.name !== void 0) updateData.name = data.name.trim();
    if (data.isActive !== void 0) updateData.isActive = data.isActive;
    return prisma.shelf.update({
      where: { id },
      data: updateData,
      include: { bins: true }
    });
  }
  static async deleteShelf(id) {
    const activeStock = await prisma.inventoryLocation.findFirst({
      where: {
        shelfId: id,
        quantity: { gt: 0 }
      },
      include: {
        inventory: {
          include: { product: { select: { name: true } } }
        }
      }
    });
    if (activeStock) {
      throw new Error(
        `Cannot delete Shelf: Active stock (${activeStock.quantity} units of ${activeStock.inventory?.product?.name || "medicine"}) is still stored on this shelf. Please move the stock first.`
      );
    }
    const shelfLocs = await prisma.inventoryLocation.findMany({
      where: { shelfId: id },
      select: { id: true }
    });
    const locIds = shelfLocs.map((l) => l.id);
    if (locIds.length > 0) {
      const movementHistory = await prisma.stockMovement.findFirst({
        where: {
          OR: [
            { fromLocationId: { in: locIds } },
            { toLocationId: { in: locIds } }
          ]
        }
      });
      if (movementHistory) {
        throw new Error(
          "Cannot delete Shelf: This shelf has stock movement audit records. Please deactivate it instead of deleting."
        );
      }
    }
    return prisma.$transaction(async (tx) => {
      await tx.inventoryLocation.deleteMany({
        where: { shelfId: id }
      });
      const bins = await tx.bin.findMany({ where: { shelfId: id }, select: { id: true } });
      const binIds = bins.map((b) => b.id);
      if (binIds.length > 0) {
        await tx.inventoryLocation.deleteMany({
          where: { binId: { in: binIds } }
        });
        await tx.bin.deleteMany({ where: { id: { in: binIds } } });
      }
      return tx.shelf.delete({ where: { id } });
    });
  }
  static async createBin(data) {
    return prisma.bin.create({
      data: {
        shelfId: data.shelfId,
        name: data.name.trim(),
        isActive: data.isActive ?? true
      }
    });
  }
  static async updateBin(id, data) {
    const updateData = {};
    if (data.name !== void 0) updateData.name = data.name.trim();
    if (data.isActive !== void 0) updateData.isActive = data.isActive;
    return prisma.bin.update({
      where: { id },
      data: updateData
    });
  }
  static async deleteBin(id) {
    const activeStock = await prisma.inventoryLocation.findFirst({
      where: {
        binId: id,
        quantity: { gt: 0 }
      },
      include: {
        inventory: {
          include: { product: { select: { name: true } } }
        }
      }
    });
    if (activeStock) {
      throw new Error(
        `Cannot delete Bin: Active stock (${activeStock.quantity} units of ${activeStock.inventory?.product?.name || "medicine"}) is still stored in this bin. Please move the stock first.`
      );
    }
    const binLocs = await prisma.inventoryLocation.findMany({
      where: { binId: id },
      select: { id: true }
    });
    const locIds = binLocs.map((l) => l.id);
    if (locIds.length > 0) {
      const movementHistory = await prisma.stockMovement.findFirst({
        where: {
          OR: [
            { fromLocationId: { in: locIds } },
            { toLocationId: { in: locIds } }
          ]
        }
      });
      if (movementHistory) {
        throw new Error(
          "Cannot delete Bin: This bin has stock movement audit records. Please deactivate it instead of deleting."
        );
      }
    }
    return prisma.$transaction(async (tx) => {
      await tx.inventoryLocation.deleteMany({
        where: { binId: id }
      });
      return tx.bin.delete({ where: { id } });
    });
  }
  /**
   * Get all physical locations with available stock for a specific batch/inventory
   * with per-location quantities, rack/shelf/bin names, labels, and packaging breakdowns.
   */
  static async getBatchLocations(inventoryId, tenantId, branchId) {
    const where = {
      inventoryId,
      quantity: { gt: 0 }
    };
    if (branchId) {
      where.inventory = { branchId };
    } else if (tenantId) {
      where.inventory = { branch: { tenantId } };
    }
    const locations = await prisma.inventoryLocation.findMany({
      where,
      include: {
        inventory: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                genericName: true,
                sku: true,
                unit: true,
                productType: true,
                category: true,
                stripsPerBox: true,
                tabletsPerStrip: true,
                qtyPerLevel2: true,
                basePrice: true
              }
            }
          }
        },
        rack: { select: { id: true, name: true, isActive: true } },
        shelf: { select: { id: true, name: true, isActive: true } },
        bin: { select: { id: true, name: true, isActive: true } }
      },
      orderBy: { createdAt: "asc" }
    });
    return locations.map((loc) => {
      const prod = loc.inventory?.product;
      const stripsPerBox = prod?.stripsPerBox || loc.inventory?.stripsPerBox || 10;
      const tabletsPerStrip = prod?.tabletsPerStrip || loc.inventory?.tabletsPerStrip || 10;
      const isMedicine = prod?.productType === "MEDICINE" || !prod?.productType || Boolean(stripsPerBox && tabletsPerStrip);
      const tabletsPerBox = isMedicine ? stripsPerBox * tabletsPerStrip : 1;
      const qty = loc.quantity || 0;
      const fullBoxes = Math.floor(qty / tabletsPerBox);
      const looseTablets = qty % tabletsPerBox;
      const openBoxes = looseTablets > 0 ? 1 : 0;
      const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
      const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
      const rackName = loc.rack?.name || "\u2014";
      const shelfName = loc.shelf?.name || "\u2014";
      const binName = loc.bin?.name || "\u2014";
      const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
      const locationLabel = parts.length > 0 ? parts.join(" \u2192 ") : "General Shelf";
      const stockParts = [];
      if (fullBoxes > 0) stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
      if (openBoxRemainingStrips > 0)
        stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
      if (openBoxRemainingTablets > 0)
        stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
      if (stockParts.length === 0) stockParts.push(`${qty} ${prod?.unit || "units"}`);
      const displayText = stockParts.join(", ");
      return {
        id: loc.id,
        inventoryId: loc.inventoryId,
        rackId: loc.rackId,
        shelfId: loc.shelfId,
        binId: loc.binId,
        quantity: qty,
        rack: loc.rack,
        shelf: loc.shelf,
        bin: loc.bin,
        rackName,
        shelfName,
        binName,
        locationLabel,
        fullBoxes,
        looseTablets,
        openBoxes,
        strips: openBoxRemainingStrips,
        tablets: openBoxRemainingTablets,
        openBoxRemainingStrips,
        openBoxRemainingTablets,
        stripsPerBox,
        tabletsPerStrip,
        tabletsPerBox,
        unit: prod?.unit || loc.inventory?.unit || "tablet",
        displayText
      };
    });
  }
};

// src/modules/location/location.validation.ts
import { z as z20 } from "zod";
var CreateRackSchema = z20.object({
  name: z20.string().min(1, "Rack name is required"),
  branchId: z20.string().optional(),
  isActive: z20.boolean().optional()
});
var UpdateRackSchema = z20.object({
  name: z20.string().min(1, "Name cannot be empty").optional(),
  isActive: z20.boolean().optional()
});
var CreateShelfSchema = z20.object({
  rackId: z20.string().min(1, "Rack ID is required"),
  name: z20.string().min(1, "Shelf name is required"),
  isActive: z20.boolean().optional()
});
var UpdateShelfSchema = z20.object({
  name: z20.string().min(1, "Name cannot be empty").optional(),
  isActive: z20.boolean().optional()
});
var CreateBinSchema = z20.object({
  shelfId: z20.string().min(1, "Shelf ID is required"),
  name: z20.string().min(1, "Bin name is required"),
  isActive: z20.boolean().optional()
});
var UpdateBinSchema = z20.object({
  name: z20.string().min(1, "Name cannot be empty").optional(),
  isActive: z20.boolean().optional()
});
var QuickCreateRackSchema = z20.object({
  name: z20.string().min(1, "Rack name/code is required").max(50, "Rack name is too long"),
  branchId: z20.string().optional(),
  numberOfShelves: z20.coerce.number().int().min(1, "At least 1 shelf is required").max(50, "Maximum 50 shelves allowed"),
  binsPerShelf: z20.coerce.number().int().min(1, "At least 1 bin per shelf is required").max(50, "Maximum 50 bins per shelf allowed"),
  isActive: z20.boolean().optional()
});

// src/modules/location/location.controller.ts
var LocationController = class {
  static async getLocations(req, res) {
    try {
      let branchId = req.query.branchId || req.user?.branchId;
      if (!branchId && req.user?.tenantId) {
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId: req.user.tenantId, isActive: true },
          select: { id: true },
          orderBy: { createdAt: "asc" }
        });
        branchId = firstBranch?.id;
      }
      if (!branchId) {
        return res.json({ success: true, data: [] });
      }
      const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
      const racks = await LocationService.getRacks(branchId, includeInactive);
      return res.json({ success: true, data: racks });
    } catch (error) {
      console.error("[LocationController.getLocations]", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: error.message,
        data: []
      });
    }
  }
  static async getBatchLocations(req, res) {
    try {
      const { inventoryId } = req.params;
      const tenantId = req.user?.tenantId;
      const branchId = req.query.branchId || req.user?.branchId;
      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          error: "inventoryId required",
          message: "inventoryId required",
          data: []
        });
      }
      const locations = await LocationService.getBatchLocations(inventoryId, tenantId, branchId);
      return res.json({ success: true, data: locations });
    } catch (error) {
      console.error("[LocationController.getBatchLocations]", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: error.message,
        data: []
      });
    }
  }
  static async quickCreateRack(req, res) {
    try {
      const data = QuickCreateRackSchema.parse(req.body);
      const tenantId = req.user?.tenantId;
      let branchId = data.branchId || req.query.branchId || req.user?.branchId;
      if (!branchId && tenantId) {
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId, isActive: true },
          select: { id: true },
          orderBy: { createdAt: "asc" }
        });
        branchId = firstBranch?.id;
      }
      if (!branchId) {
        return res.status(400).json({
          success: false,
          error: "Branch ID required. Please select an active branch.",
          message: "Branch ID required. Please select an active branch."
        });
      }
      if (tenantId) {
        const validBranch = await prisma.branch.findFirst({
          where: { id: branchId, tenantId, isActive: true }
        });
        if (!validBranch) {
          return res.status(403).json({
            success: false,
            error: "Access denied: Branch does not belong to your organization or is inactive.",
            message: "Access denied: Branch does not belong to your organization or is inactive."
          });
        }
      }
      const rack = await LocationService.quickCreateRack(branchId, data);
      return res.status(201).json({
        success: true,
        message: `Rack "${rack.name}" created with ${rack.numberOfShelves} shelves and ${rack.numberOfBins} bins.`,
        data: rack
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async createRack(req, res) {
    try {
      const data = CreateRackSchema.parse(req.body);
      const tenantId = req.user?.tenantId;
      let branchId = data.branchId || req.query.branchId || req.user?.branchId;
      if (!branchId && tenantId) {
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId, isActive: true },
          select: { id: true },
          orderBy: { createdAt: "asc" }
        });
        branchId = firstBranch?.id;
      }
      if (!branchId) {
        return res.status(400).json({
          success: false,
          error: "Branch ID required. Please select an active branch.",
          message: "Branch ID required. Please select an active branch."
        });
      }
      if (tenantId) {
        const validBranch = await prisma.branch.findFirst({
          where: { id: branchId, tenantId, isActive: true }
        });
        if (!validBranch) {
          return res.status(403).json({
            success: false,
            error: "Access denied: Branch does not belong to your organization or is inactive.",
            message: "Access denied: Branch does not belong to your organization or is inactive."
          });
        }
      }
      const rack = await LocationService.createRack(branchId, data);
      return res.status(201).json({ success: true, data: rack });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async updateRack(req, res) {
    try {
      const { id } = req.params;
      const data = UpdateRackSchema.parse(req.body);
      const rack = await LocationService.updateRack(id, data);
      return res.json({ success: true, data: rack });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async deleteRack(req, res) {
    try {
      const { id } = req.params;
      await LocationService.deleteRack(id);
      return res.json({ success: true, message: "Rack deleted successfully" });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async createShelf(req, res) {
    try {
      const data = CreateShelfSchema.parse(req.body);
      const shelf = await LocationService.createShelf(data);
      return res.status(201).json({ success: true, data: shelf });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async updateShelf(req, res) {
    try {
      const { id } = req.params;
      const data = UpdateShelfSchema.parse(req.body);
      const shelf = await LocationService.updateShelf(id, data);
      return res.json({ success: true, data: shelf });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async deleteShelf(req, res) {
    try {
      const { id } = req.params;
      await LocationService.deleteShelf(id);
      return res.json({ success: true, message: "Shelf deleted successfully" });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async createBin(req, res) {
    try {
      const data = CreateBinSchema.parse(req.body);
      const bin = await LocationService.createBin(data);
      return res.status(201).json({ success: true, data: bin });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async updateBin(req, res) {
    try {
      const { id } = req.params;
      const data = UpdateBinSchema.parse(req.body);
      const bin = await LocationService.updateBin(id, data);
      return res.json({ success: true, data: bin });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
  static async deleteBin(req, res) {
    try {
      const { id } = req.params;
      await LocationService.deleteBin(id);
      return res.json({ success: true, message: "Bin deleted successfully" });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
  }
};

// src/modules/location/location.routes.ts
var router21 = Router21();
router21.use(authenticate);
router21.get("/", requirePermission("location.rack_list"), LocationController.getLocations);
router21.get("/batch/:inventoryId", requirePermission("location.rack_list"), LocationController.getBatchLocations);
router21.post("/quick-rack", requirePermission("location.create_rack"), LocationController.quickCreateRack);
router21.post("/racks", requirePermission("location.create_rack"), LocationController.createRack);
router21.patch("/racks/:id", requirePermission("location.create_rack"), LocationController.updateRack);
router21.delete("/racks/:id", requirePermission("location.create_rack"), LocationController.deleteRack);
router21.post("/shelves", requirePermission("location.create_rack"), LocationController.createShelf);
router21.patch("/shelves/:id", requirePermission("location.create_rack"), LocationController.updateShelf);
router21.delete("/shelves/:id", requirePermission("location.create_rack"), LocationController.deleteShelf);
router21.post("/bins", requirePermission("location.create_rack"), LocationController.createBin);
router21.patch("/bins/:id", requirePermission("location.create_rack"), LocationController.updateBin);
router21.delete("/bins/:id", requirePermission("location.create_rack"), LocationController.deleteBin);
var location_routes_default = router21;

// src/app.ts
import path3 from "path";
var app = express();
var port = process.env.PORT || 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-branch-id, X-Branch-Id");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));
app.use("/uploads", express.static(path3.join(process.cwd(), "public", "uploads")));
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Multi-Tenant SaaS Pharmacy Management API",
    version: "1.0.0",
    status: "Healthy",
    timestamp: /* @__PURE__ */ new Date()
  });
});
app.use("/api/auth", router);
app.use("/api/super-admin", router2);
app.use("/api/subscriptions", router3);
app.use("/api/payments", router4);
app.use("/api/tenant", router5);
app.use("/api/branches", router6);
app.use("/api/users", router7);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transfers", router10);
app.use("/api/sales", router11);
app.use("/api/reports", router12);
app.use("/api/audit", router13);
app.use("/api/notifications", router14);
app.use("/api/sync", router15);
app.use("/api/settings", router16);
app.use("/api/upload", router17);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/locations", location_routes_default);
app.all("/payment/success", PaymentController.handleSuccess);
app.all("/payment/fail", PaymentController.handleFail);
app.all("/payment/cancel", PaymentController.handleCancel);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});
app.use((err, req, res, next) => {
  console.error("[Unhandled API Error]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});
if (!process.env.VERCEL) {
  app.listen(port, async () => {
    console.log(`Pharmacy Management SaaS API listening on port ${port}`);
    await seedSuperAdmin();
    SubscriptionExpiryService.initAutomatedScheduler();
  });
}
var app_default = app;

// src/index.ts
var index_default = app_default;
export {
  index_default as default
};
