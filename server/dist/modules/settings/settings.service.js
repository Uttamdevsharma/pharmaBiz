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
        email: "support@pharmabiz.com",
        phone: "+880 1700-000000",
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
}
exports.SettingsService = SettingsService;
