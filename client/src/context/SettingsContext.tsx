"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export interface PlanItem {
  id: string;
  name: string;
  tier: "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";
  price: number | string;
  billingCycle: string;
  maxBranches: number;
  features?: any;
  isActive: boolean;
}

export interface SiteSettings {
  siteName: string;
  logoUrl?: string;
  primaryColor: string;
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaPrimaryText: string;
    ctaSecondaryText: string;
  };
  features: Array<{
    id?: string;
    title: string;
    description: string;
    icon?: string;
  }>;
  howItWorks: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  contact: {
    email: string;
    phone: string;
    address: string;
    supportHours: string;
  };
  about: {
    headline: string;
    description: string;
    stats: Array<{ label: string; value: string }>;
  };
  plans?: PlanItem[];
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "PharmaFlow SaaS",
  logoUrl: "",
  primaryColor: "#059669",
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
      description: "Counter sales never stop. Keep dispensing medicines offline with automatic cloud synchronization.",
      icon: "Zap",
    },
    {
      id: "multi-branch",
      title: "Multi-Branch & Region Control",
      description: "Manage multiple branch locations, assign regional managers, and track company-wide performance.",
      icon: "Building2",
    },
    {
      id: "inventory-expiry",
      title: "Inventory & Expiry Tracking",
      description: "Automated low-stock warnings, near-expiry alerts, batch tracking, and audit trails.",
      icon: "ShieldAlert",
    },
    {
      id: "inter-branch",
      title: "Inter-Branch Stock Transfers",
      description: "Seamless stock movement requests with regional admin approvals and atomic ledger adjustments.",
      icon: "ArrowLeftRight",
    },
    {
      id: "tiered-rbac",
      title: "Granular RBAC Security",
      description: "Role-based access control protecting prescription drugs, voiding sales, and compliance audits.",
      icon: "ShieldCheck",
    },
    {
      id: "sslcommerz",
      title: "Instant Subscription Payments",
      description: "Integrated SSLCOMMERZ gateway for instant card/mobile banking subscription renewals and upgrades.",
      icon: "CreditCard",
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: "Choose Your Plan & Sign Up",
      description: "Select the Starter, Growth, or Enterprise plan matching your branch scale.",
    },
    {
      step: 2,
      title: "Set Up Branches & Staff",
      description: "Add your store branches, assign branch managers, cashiers, and configure your drug catalog.",
    },
    {
      step: 3,
      title: "Start Selling Anywhere",
      description: "Launch the POS at counter tablets or desktops with full offline capability and automated sync.",
    },
  ],
  contact: {
    email: "support@pharmaflow.com",
    phone: "+880 1700-000000",
    address: "Gulshan-2, Dhaka-1212, Bangladesh",
    supportHours: "24/7 Dedicated Support",
  },
  about: {
    headline: "Built for Modern Pharmacy Enterprises",
    description: "PharmaFlow provides a complete operating system for retail pharmacies and hospital chains.",
    stats: [
      { label: "Uptime Guaranteed", value: "99.99%" },
      { label: "Offline Resilience", value: "72+ Hours" },
      { label: "POS Speed", value: "< 1 Sec" },
      { label: "Pharmacies Powered", value: "500+" },
    ],
  },
};

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refreshSettings: async () => {},
});

// Helper to convert hex to RGB
function hexToRgb(hex: string) {
  const cleanHex = hex.replace("#", "");
  let r = 5, g = 150, b = 105;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  }
  return `${r}, ${g}, ${b}`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const applyThemeColor = (color: string) => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--primary-color", color);
      root.style.setProperty("--primary-rgb", hexToRgb(color));
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetchApi<SiteSettings>("/settings/public");
      if (res.success && res.data) {
        setSettings(res.data);
        if (res.data.primaryColor) {
          applyThemeColor(res.data.primaryColor);
        }
      }
    } catch (err) {
      console.warn("Could not load backend public settings, using defaults.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: loadSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
