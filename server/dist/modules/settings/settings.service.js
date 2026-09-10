"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = exports.DEFAULT_SETTINGS = void 0;
const prisma_1 = require("../../app/lib/prisma");
const SETTINGS_KEY = "landing_page_config";
exports.DEFAULT_SETTINGS = {
    siteName: "PharmaBiz SaaS",
    logoUrl: "",
    logoPublicId: "",
    primaryColor: "#059669", // Emerald Green default
    hero: {
        badge: "Next-Gen Multi-Tenant Pharmacy Platform",
        title: "Empower Your Pharmacy Chain With Smart Offline-First SaaS",
        subtitle: "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime even when the internet is disconnected.",
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
        description: "PharmaBiz provides a complete operating system for retail pharmacies and hospital chains, offering bulletproof reliability and multi-tenant data isolation.",
        stats: [
            { label: "Uptime Guaranteed", value: "99.99%" },
            { label: "Offline Resilience", value: "72+ Hours" },
            { label: "POS Transaction Speed", value: "< 1 Sec" },
            { label: "Pharmacies Powered", value: "500+" },
        ],
    },
};
class SettingsService {
    /**
     * Get public landing page content and theme configuration
     */
    static async getPublicSettings() {
        let setting = await prisma_1.prisma.platformSetting.findUnique({
            where: { key: SETTINGS_KEY },
        });
        let config = setting ? setting.value : exports.DEFAULT_SETTINGS;
        // Fetch active subscription plans dynamically
        const plans = await prisma_1.prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { price: "asc" },
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
        let setting = await prisma_1.prisma.platformSetting.findUnique({
            where: { key: SETTINGS_KEY },
        });
        return setting ? setting.value : exports.DEFAULT_SETTINGS;
    }
    /**
     * Update platform settings from Super Admin
     */
    static async updateSettings(data) {
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
        const saved = await prisma_1.prisma.platformSetting.upsert({
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
    static async getTenantVatSettings(tenantId) {
        const key = `vat_settings_${tenantId}`;
        const setting = await prisma_1.prisma.platformSetting.findUnique({
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
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        };
        const setting = await prisma_1.prisma.platformSetting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
        return setting.value;
    }
    /**
     * Get pharmacy-specific UI/invoice settings (per-tenant, separate from SaaS branding)
     */
    static async getPharmacySettings(tenantId) {
        const key = `pharmacy_settings_${tenantId}`;
        const setting = await prisma_1.prisma.platformSetting.findUnique({ where: { key } });
        if (!setting) {
            return {
                receiptHeaderNote: "Thank you for shopping with us. Get well soon!",
                receiptFooterNote: "Items can be returned within 48 hours with original invoice and valid prescription.",
                prescriptionRequiredMessage: "⚠️ This product requires a valid doctor's prescription. Please provide the prescription reference number or doctor's name before completing the purchase.",
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
            ...(data.receiptHeaderNote !== undefined && { receiptHeaderNote: String(data.receiptHeaderNote).trim() }),
            ...(data.receiptFooterNote !== undefined && { receiptFooterNote: String(data.receiptFooterNote).trim() }),
            ...(data.prescriptionRequiredMessage !== undefined && {
                prescriptionRequiredMessage: String(data.prescriptionRequiredMessage).trim(),
            }),
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
        };
        const setting = await prisma_1.prisma.platformSetting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
        return setting.value;
    }
}
exports.SettingsService = SettingsService;
