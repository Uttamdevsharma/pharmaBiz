import { prisma } from "../../app/lib/prisma";
import { UpdatePlatformSettingsInput } from "./settings.validation";
import { encryptSecret, decryptSecret, maskSecret, isMasked } from "../../app/lib/payment-security";

const SETTINGS_KEY = "landing_page_config";

export const DEFAULT_SETTINGS = {
  siteName: "BizPharma SaaS",
  logoUrl: "",
  logoPublicId: "",
  primaryColor: "#059669", // Emerald Green default
  hero: {
    badge: "Next-Gen Multi-Tenant Pharmacy Platform",
    title: "Empower Your Pharmacy Chain With Smart Offline-First SaaS",
    subtitle:
      "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime even when the internet is disconnected.",
    ctaPrimaryText: "Get Started Now",
    ctaSecondaryText: "Explore Plans",
  },
  features: [
    {
      id: "offline-pos",
      title: "Offline-First POS",
      description: "Counter sales never stop. Keep dispensing medicines offline with automatic cloud synchronization upon reconnection.",
      icon: "Zap",
    },
    {
      id: "multi-branch",
      title: "Multi-Branch & Region Control",
      description: "Manage multiple branch locations, assign regional managers, and track company-wide performance from a single dashboard.",
      icon: "Building2",
    },
    {
      id: "inventory-expiry",
      title: "Inventory & Expiry Tracking",
      description: "Automated low-stock warnings, near-expiry alerts, batch tracking, and audit trails for maximum patient safety.",
      icon: "ShieldAlert",
    },
    {
      id: "inter-branch",
      title: "Inter-Branch Stock Transfers",
      description: "Seamless stock movement requests with regional admin approvals and atomic ledger adjustments across branches.",
      icon: "ArrowLeftRight",
    },
    {
      id: "tiered-rbac",
      title: "Granular RBAC Security",
      description: "Role-based access control protecting prescription drugs, voiding sales, and compliance audits both online and offline.",
      icon: "ShieldCheck",
    },
    {
      id: "sslcommerz",
      title: "Instant Subscription Payments",
      description: "Integrated SSLCOMMERZ gateway for instant card/mobile banking subscription renewals and plan upgrades.",
      icon: "CreditCard",
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: "Choose Your Plan & Sign Up",
      description: "Select the Starter, Growth, or Enterprise plan matching your branch scale and complete secure payment.",
    },
    {
      step: 2,
      title: "Set Up Branches & Staff",
      description: "Add your store branches, assign branch managers, cashiers, and configure your central drug catalog.",
    },
    {
      step: 3,
      title: "Start Selling Anywhere",
      description: "Launch the POS at counter tablets or desktops and sell seamlessly with full offline capability and automated cloud sync.",
    },
  ],
  contact: {
    email: "shameem.rml@gmail.com",
    phone: "01973590937",
    address: "Gulshan-2, Dhaka-1212, Bangladesh",
    supportHours: "24/7 Dedicated Support",
  },
  about: {
    headline: "Built for Modern Pharmacy Enterprises",
    description: "BizPharma provides a complete operating system for retail pharmacies and hospital chains, offering bulletproof reliability and multi-tenant data isolation.",
    stats: [
      { label: "Uptime Guaranteed", value: "99.99%" },
      { label: "Offline Resilience", value: "72+ Hours" },
      { label: "POS Transaction Speed", value: "< 1 Sec" },
      { label: "Pharmacies Powered", value: "500+" },
    ],
  },
};

export class SettingsService {
  /**
   * Get public landing page content and theme configuration
   */
  static async getPublicSettings() {
    let setting = await (prisma as any).platformSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    let config = setting ? setting.value : DEFAULT_SETTINGS;
    if (config && (!config.siteName || config.siteName.toLowerCase().includes("pharmabiz"))) {
      config = { ...config, siteName: "BizPharma SaaS" };
    }

    // Fetch active subscription plans dynamically
    const rawPlans = await (prisma as any).subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const plans = rawPlans.map((p: any) => {
      const feat = (typeof p.features === "object" && p.features !== null) ? p.features : {};
      const isTrial = Boolean(feat.isTrial || p.tier === "TRIAL");
      const isCustom = Boolean(feat.isCustom);
      const isPopular = Boolean(feat.isPopular ?? p.isPopular ?? false);
      const trialDays = Number(p.trialDays ?? feat.trialDays ?? (isTrial ? 7 : 0));
      const featureList = Array.isArray(feat.featureList) ? feat.featureList : [];
      return {
        ...p,
        isTrial,
        isCustom,
        isPopular,
        trialDays,
        featureList,
        whatsappNumber: feat.whatsappNumber || "",
        customMessage: feat.customMessage || "",
        maxStaffPerBranch: feat.maxStaffPerBranch ?? (p.tier === "STARTER" ? 1 : p.tier === "GROWTH" ? 3 : 5),
        maxTotalStaff: feat.maxTotalStaff ?? (p.maxBranches * (feat.maxStaffPerBranch ?? 1)),
        yearlyDiscountPercent: feat.yearlyDiscountPercent ?? 17,
      };
    });

    return {
      ...config,
      plans,
    };
  }

  /**
   * Get raw platform settings for Super Admin
   */
  static async getAdminSettings() {
    let setting = await (prisma as any).platformSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    return setting ? setting.value : DEFAULT_SETTINGS;
  }

  /**
   * Update platform settings from Super Admin
   */
  static async updateSettings(data: UpdatePlatformSettingsInput) {
    const current = await this.getAdminSettings();

    const merged = {
      ...current,
      ...(data.siteName !== undefined && { siteName: data.siteName }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.logoPublicId !== undefined && { logoPublicId: data.logoPublicId }),
      ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
      ...(data.hero && { hero: { ...current.hero, ...data.hero } }),
      ...(data.features && { features: data.features }),
      ...(data.howItWorks && { howItWorks: data.howItWorks }),
      ...(data.contact && { contact: { ...current.contact, ...data.contact } }),
      ...(data.about && { about: { ...current.about, ...data.about } }),
    };

    const saved = await (prisma as any).platformSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: merged },
      create: {
        key: SETTINGS_KEY,
        value: merged,
      },
    });

    return saved.value;
  }

  /**
   * Get tenant-specific VAT & Tax configuration
   */
  static async getTenantVatSettings(tenantId: string) {
    const key = `vat_settings_${tenantId}`;
    const setting = await (prisma as any).platformSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return {
        vatPercent: 0,
        isVatEnabled: false,
        vatNumber: "",
        taxType: "EXCLUSIVE",
      };
    }

    return setting.value;
  }

  /**
   * Update tenant-specific VAT & Tax configuration
   */
  static async updateTenantVatSettings(tenantId: string, userId: string, data: any) {
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
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    const setting = await (prisma as any).platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    return setting.value;
  }

  /**
   * Get pharmacy-specific UI/invoice settings (per-tenant, separate from SaaS branding)
   */
  static async getPharmacySettings(tenantId: string) {
    const key = `pharmacy_settings_${tenantId}`;
    const setting = await (prisma as any).platformSetting.findUnique({ where: { key } });

    if (!setting) {
      return {
        receiptHeaderNote: "Thank you for shopping with us. Get well soon!",
        receiptFooterNote: "Items can be returned within 48 hours with original invoice and valid prescription.",
        prescriptionRequiredMessage:
          "⚠️ This product requires a valid doctor's prescription. Please provide the prescription reference number or doctor's name before completing the purchase.",
      };
    }

    return setting.value;
  }

  /**
   * Update pharmacy-specific UI/invoice settings (per-tenant)
   */
  static async updatePharmacySettings(tenantId: string, userId: string, data: any) {
    const key = `pharmacy_settings_${tenantId}`;

    const current = await this.getPharmacySettings(tenantId);

    const value = {
      ...current,
      ...(data.receiptHeaderNote !== undefined && { receiptHeaderNote: String(data.receiptHeaderNote).trim() }),
      ...(data.receiptFooterNote !== undefined && { receiptFooterNote: String(data.receiptFooterNote).trim() }),
      ...(data.prescriptionRequiredMessage !== undefined && {
        prescriptionRequiredMessage: String(data.prescriptionRequiredMessage).trim(),
      }),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    const setting = await (prisma as any).platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    return setting.value;
  }

  /**
   * Get payment gateway settings for Super Admin (Masked secrets)
   */
  static async getPaymentGatewaySettings() {
    let settings = await (prisma as any).platform_settings.findFirst({
      orderBy: { id: "asc" },
    });

    if (!settings) {
      settings = await (prisma as any).platform_settings.create({
        data: {
          bkash_merchant_enabled: false,
          bkash_is_live: false,
          nagad_merchant_enabled: false,
          nagad_is_live: false,
          eps_merchant_enabled: false,
          eps_is_live: false,
          manual_payment_active: true,
          bkash_number: "01750000000",
          nagad_number: "01850000000",
        },
      });
    }

    return {
      // bKash Merchant Configuration
      bkash_merchant_enabled: Boolean(settings.bkash_merchant_enabled),
      bkash_is_live: Boolean(settings.bkash_is_live),
      bkash_app_key: settings.bkash_app_key || "",
      bkash_app_secret: maskSecret(settings.bkash_app_secret),
      bkash_username: settings.bkash_username || "",
      bkash_password: maskSecret(settings.bkash_password),

      // Nagad Merchant Configuration
      nagad_merchant_enabled: Boolean(settings.nagad_merchant_enabled),
      nagad_is_live: Boolean(settings.nagad_is_live),
      nagad_merchant_id: settings.nagad_merchant_id || "",
      nagad_merchant_phone: settings.nagad_merchant_phone || "",
      nagad_public_key: settings.nagad_public_key || "",
      nagad_private_key: maskSecret(settings.nagad_private_key),

      // EPS Configuration
      eps_merchant_enabled: Boolean(settings.eps_merchant_enabled),
      eps_is_live: Boolean(settings.eps_is_live),
      eps_merchant_id: settings.eps_merchant_id || "",
      eps_store_id: settings.eps_store_id || "",
      eps_username: settings.eps_username || "",
      eps_password: maskSecret(settings.eps_password),
      eps_hash_key: maskSecret(settings.eps_hash_key),

      // Manual MFS Configuration
      manual_payment_active: Boolean(settings.manual_payment_active),
      bkash_number: settings.bkash_number || "",
      nagad_number: settings.nagad_number || "",

      // Legacy structures for backward compatibility
      manualBkash: {
        enabled: Boolean(settings.manual_payment_active),
        number: settings.bkash_number || "01750000000",
        accountNumber: settings.bkash_number || "01750000000",
        accountType: "Personal",
        instructions: "অনুগ্রহ করে এই বিকাশ নাম্বারে Send Money করুন এবং ট্রানজেকশন আইডি দিন।",
      },
      sslcommerz: {
        enabled: false,
        storeId: "",
        storePassword: "",
        isSandbox: true,
      },
    };
  }

  /**
   * Get public payment gateway settings (Safe booleans only, no secrets)
   */
  static async getPublicPaymentGateways() {
    let settings = await (prisma as any).platform_settings.findFirst({
      orderBy: { id: "asc" },
    });

    const bkash_merchant_active = Boolean(settings?.bkash_merchant_enabled);
    const nagad_merchant_active = Boolean(settings?.nagad_merchant_enabled);
    const eps_merchant_active = Boolean(settings?.eps_merchant_enabled);
    const manual_payment_active = settings ? Boolean(settings.manual_payment_active) : true;
    const bkash_number = settings?.bkash_number || "01750000000";
    const nagad_number = settings?.nagad_number || "01850000000";

    return {
      // BizPOS Format
      bkash_merchant_active,
      nagad_merchant_active,
      eps_merchant_active,
      manual_payment_active,
      bkash_number,
      nagad_number,

      // Legacy Object format
      manualBkash: {
        enabled: manual_payment_active,
        number: bkash_number,
        accountNumber: bkash_number,
        accountType: "Personal",
        instructions: "অনুগ্রহ করে এই পার্সোনাল বিকাশ নাম্বারে Send Money করুন। রেফারেন্স হিসেবে আপনার ফার্মেসির নাম ব্যবহার করুন। টাকা পাঠানোর পর প্রেরকের নম্বর, TrxID এবং স্ক্রিনশট আপলোড করে সাবমিট করুন।",
      },
      sslcommerz: {
        enabled: false,
      },
    };
  }

  /**
   * Update payment gateway settings from Super Admin (Encrypts secrets before save)
   */
  static async updatePaymentGatewaySettings(data: any) {
    let current = await (prisma as any).platform_settings.findFirst({
      orderBy: { id: "asc" },
    });

    if (!current) {
      current = await (prisma as any).platform_settings.create({
        data: {},
      });
    }

    const updateData: any = {};

    // bKash Merchant
    if (data.bkash_merchant_enabled !== undefined) {
      updateData.bkash_merchant_enabled = Boolean(data.bkash_merchant_enabled);
    }
    if (data.bkash_is_live !== undefined) {
      updateData.bkash_is_live = Boolean(data.bkash_is_live);
    }
    if (data.bkash_app_key !== undefined) {
      updateData.bkash_app_key = String(data.bkash_app_key).trim();
    }
    if (data.bkash_app_secret !== undefined && !isMasked(data.bkash_app_secret)) {
      updateData.bkash_app_secret = encryptSecret(String(data.bkash_app_secret).trim());
    }
    if (data.bkash_username !== undefined) {
      updateData.bkash_username = String(data.bkash_username).trim();
    }
    if (data.bkash_password !== undefined && !isMasked(data.bkash_password)) {
      updateData.bkash_password = encryptSecret(String(data.bkash_password).trim());
    }

    // Nagad Merchant
    if (data.nagad_merchant_enabled !== undefined) {
      updateData.nagad_merchant_enabled = Boolean(data.nagad_merchant_enabled);
    }
    if (data.nagad_is_live !== undefined) {
      updateData.nagad_is_live = Boolean(data.nagad_is_live);
    }
    if (data.nagad_merchant_id !== undefined) {
      updateData.nagad_merchant_id = String(data.nagad_merchant_id).trim();
    }
    if (data.nagad_merchant_phone !== undefined) {
      updateData.nagad_merchant_phone = String(data.nagad_merchant_phone).trim();
    }
    if (data.nagad_public_key !== undefined) {
      updateData.nagad_public_key = String(data.nagad_public_key).trim();
    }
    if (data.nagad_private_key !== undefined && !isMasked(data.nagad_private_key)) {
      updateData.nagad_private_key = encryptSecret(String(data.nagad_private_key).trim());
    }

    // EPS Gateway
    if (data.eps_merchant_enabled !== undefined) {
      updateData.eps_merchant_enabled = Boolean(data.eps_merchant_enabled);
    }
    if (data.eps_is_live !== undefined) {
      updateData.eps_is_live = Boolean(data.eps_is_live);
    }
    if (data.eps_merchant_id !== undefined) {
      updateData.eps_merchant_id = String(data.eps_merchant_id).trim();
    }
    if (data.eps_store_id !== undefined) {
      updateData.eps_store_id = String(data.eps_store_id).trim();
    }
    if (data.eps_username !== undefined) {
      updateData.eps_username = String(data.eps_username).trim();
    }
    if (data.eps_password !== undefined && !isMasked(data.eps_password)) {
      updateData.eps_password = encryptSecret(String(data.eps_password).trim());
    }
    if (data.eps_hash_key !== undefined && !isMasked(data.eps_hash_key)) {
      updateData.eps_hash_key = encryptSecret(String(data.eps_hash_key).trim());
    }

    // Manual MFS
    if (data.manual_payment_active !== undefined) {
      updateData.manual_payment_active = Boolean(data.manual_payment_active);
    } else if (data.manualBkash?.enabled !== undefined) {
      updateData.manual_payment_active = Boolean(data.manualBkash.enabled);
    }

    if (data.bkash_number !== undefined) {
      updateData.bkash_number = String(data.bkash_number).trim();
    } else if (data.manualBkash?.number !== undefined || data.manualBkash?.accountNumber !== undefined) {
      updateData.bkash_number = String(data.manualBkash.number || data.manualBkash.accountNumber).trim();
    }

    if (data.nagad_number !== undefined) {
      updateData.nagad_number = String(data.nagad_number).trim();
    }

    updateData.updated_at = new Date();

    const saved = await (prisma as any).platform_settings.update({
      where: { id: current.id },
      data: updateData,
    });

    // Also sync to PlatformSetting json key for redundancy
    try {
      await (prisma as any).platformSetting.upsert({
        where: { key: "payment_gateway_settings" },
        create: { key: "payment_gateway_settings", value: updateData },
        update: { value: updateData },
      });
    } catch {}

    return this.getPaymentGatewaySettings();
  }
}

