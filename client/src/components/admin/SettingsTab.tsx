"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { fetchApi } from "@/lib/api";
import { ImageUploader } from "@/components/common/ImageUploader";
import {
  Palette,
  LayoutTemplate,
  Save,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  ImageIcon,
  Loader2,
  Building2,
  PhoneCall,
  Zap,
  Edit2,
  X,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Sliders,
  Mail,
  Phone,
  MapPin,
  Clock,
  Eye,
  Check,
  Building,
  CreditCard,
} from "lucide-react";

// Curated preset color palettes for health & enterprise SaaS
const PRESET_COLORS = [
  { name: "Emerald Medical", hex: "#059669" },
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Indigo Violet", hex: "#4f46e5" },
  { name: "Teal Cyan", hex: "#0891b2" },
  { name: "Crimson Care", hex: "#e11d48" },
  { name: "Amber Clinical", hex: "#d97706" },
];

type SettingsSubTab =
  | "logo-name"
  | "brand-color"
  | "landing-hero"
  | "platform-features"
  | "company-contact"
  | "payment-gateways";

export function SettingsTab() {
  const { settings, loading, refreshSettings } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("logo-name");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit toggles per tab (inputs are hidden when false)
  const [editingTab, setEditingTab] = useState<Record<SettingsSubTab, boolean>>({
    "logo-name": false,
    "brand-color": false,
    "landing-hero": false,
    "platform-features": false,
    "company-contact": false,
    "payment-gateways": false,
  });

  // Local form state
  const [siteName, setSiteName] = useState(settings.siteName || "PharmaBiz SaaS");
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || "");
  const [logoPublicId, setLogoPublicId] = useState((settings as any).logoPublicId || "");
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || "#059669");

  const [heroBadge, setHeroBadge] = useState(settings.hero?.badge || "Next-Gen Multi-Tenant Pharmacy Platform");
  const [heroTitle, setHeroTitle] = useState(
    settings.hero?.title || "Empower Your Pharmacy Chain With Smart Offline-First SaaS"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    settings.hero?.subtitle ||
      "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime."
  );
  const [ctaPrimaryText, setCtaPrimaryText] = useState(settings.hero?.ctaPrimaryText || "Get Started Now");
  const [ctaSecondaryText, setCtaSecondaryText] = useState(settings.hero?.ctaSecondaryText || "Explore Plans");

  const [contactEmail, setContactEmail] = useState(settings.contact?.email || "support@pharmabiz.com");
  const [contactPhone, setContactPhone] = useState(settings.contact?.phone || "+880 1700-000000");
  const [contactAddress, setContactAddress] = useState(
    settings.contact?.address || "Gulshan-2, Dhaka-1212, Bangladesh"
  );
  const [supportHours, setSupportHours] = useState(settings.contact?.supportHours || "24/7 Dedicated Support");

  const [features, setFeatures] = useState(settings.features || []);

  // Payment Gateway Settings Form State
  const [gatewaySettings, setGatewaySettings] = useState<any>({
    manualBkash: {
      enabled: true,
      number: "01700000000",
      type: "PERSONAL",
      instructions: "bKash Send Money করুন এই নম্বরে এবং ট্রানজেকশন আইডি দিন।",
    },
    sslcommerz: {
      enabled: false,
      storeId: "",
      storePassword: "",
      isSandbox: true,
    },
  });
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [savingGateways, setSavingGateways] = useState(false);

  const loadGatewaySettings = async () => {
    setLoadingGateways(true);
    try {
      const res = await fetchApi<any>("/settings/admin-payment-gateways");
      if (res.success && res.data) {
        setGatewaySettings(res.data);
      }
    } catch (err) {
      console.error("Failed to load gateway settings", err);
    } finally {
      setLoadingGateways(false);
    }
  };

  useEffect(() => {
    loadGatewaySettings();
  }, []);

  const handleSaveGatewaySettings = async () => {
    setSavingGateways(true);
    setSuccessMessage(null);
    try {
      const res = await fetchApi<any>("/settings/admin-payment-gateways", {
        method: "PUT",
        body: JSON.stringify(gatewaySettings),
      });
      if (res.success) {
        setSuccessMessage("Payment gateway settings updated successfully! Live checkout experience updated.");
        await loadGatewaySettings();
      } else {
        alert(res.message || "Failed to update payment gateway settings");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update payment gateway settings");
    } finally {
      setSavingGateways(false);
    }
  };

  // Sync state when settings update from context
  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || "PharmaBiz SaaS");
      setLogoUrl(settings.logoUrl || "");
      setLogoPublicId((settings as any).logoPublicId || "");
      setPrimaryColor(settings.primaryColor || "#059669");

      if (settings.hero) {
        setHeroBadge(settings.hero.badge || "");
        setHeroTitle(settings.hero.title || "");
        setHeroSubtitle(settings.hero.subtitle || "");
        setCtaPrimaryText(settings.hero.ctaPrimaryText || "");
        setCtaSecondaryText(settings.hero.ctaSecondaryText || "");
      }

      if (settings.contact) {
        setContactEmail(settings.contact.email || "");
        setContactPhone(settings.contact.phone || "");
        setContactAddress(settings.contact.address || "");
        setSupportHours(settings.contact.supportHours || "");
      }

      if (settings.features) {
        setFeatures(settings.features);
      }
    }
  }, [settings]);

  const toggleEdit = (tab: SettingsSubTab, value?: boolean) => {
    setEditingTab((prev) => ({
      ...prev,
      [tab]: value !== undefined ? value : !prev[tab],
    }));
  };

  const handleColorSelect = (hex: string) => {
    setPrimaryColor(hex);
    document.documentElement.style.setProperty("--primary-color", hex);
  };

  const handleAddFeature = () => {
    setFeatures([
      ...features,
      {
        id: `feat-${Date.now()}`,
        title: "New Capability",
        description: "Describe how this feature boosts pharmacy operations.",
        icon: "Zap",
      },
    ]);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, idx) => idx !== index));
  };

  const handleFeatureChange = (index: number, field: string, val: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: val };
    setFeatures(updated);
  };

  const handleSaveSettings = async (tabToClose?: SettingsSubTab) => {
    setSaving(true);
    setSuccessMessage(null);

    const payload = {
      siteName,
      logoUrl,
      logoPublicId,
      primaryColor,
      hero: {
        badge: heroBadge,
        title: heroTitle,
        subtitle: heroSubtitle,
        ctaPrimaryText,
        ctaSecondaryText,
      },
      features,
      contact: {
        email: contactEmail,
        phone: contactPhone,
        address: contactAddress,
        supportHours,
      },
    };

    try {
      const res = await fetchApi("/settings/admin", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessMessage("Platform settings updated successfully! Changes are live across the system.");
        await refreshSettings();
        if (tabToClose) {
          toggleEdit(tabToClose, false);
        } else {
          setEditingTab({
            "logo-name": false,
            "brand-color": false,
            "landing-hero": false,
            "platform-features": false,
            "company-contact": false,
            "payment-gateways": false,
          });
        }
      } else {
        alert(res.message || "Failed to update settings");
      }
    } catch (err: any) {
      alert(err.message || "Error saving platform settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Platform Management</span>
            <span>/</span>
            <span className="text-brand-primary">Settings</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sliders className="h-7 w-7 text-brand-primary" />
            <span>Platform Settings & Branding</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your dynamic platform logo, site name, brand color theme, landing hero section, and company details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshSettings}
            disabled={loading || saving}
            className="h-10 px-4 rounded-none text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 rounded-none text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Tab Menu (5 Subtabs) */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab("logo-name")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer rounded-none ${
            activeSubTab === "logo-name"
              ? "border-brand-primary text-brand-primary bg-brand-primary/5"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Platform Logo & Name</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("brand-color")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer rounded-none ${
            activeSubTab === "brand-color"
              ? "border-brand-primary text-brand-primary bg-brand-primary/5"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Dynamic Brand Color Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("landing-hero")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer rounded-none ${
            activeSubTab === "landing-hero"
              ? "border-brand-primary text-brand-primary bg-brand-primary/5"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" />
          <span>Landing Page Hero & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("platform-features")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer rounded-none ${
            activeSubTab === "platform-features"
              ? "border-brand-primary text-brand-primary bg-brand-primary/5"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Dynamic Platform Features</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("company-contact")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer rounded-none ${
            activeSubTab === "company-contact"
              ? "border-brand-primary text-brand-primary bg-brand-primary/5"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Company Contact & HQ Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("payment-gateways")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer rounded-none ${
            activeSubTab === "payment-gateways"
              ? "border-brand-primary text-brand-primary bg-brand-primary/5"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          <CreditCard className="h-4 w-4 text-pink-600" />
          <span>Payment Gateways & bKash</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-none" />
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800 rounded-none" />
          <div className="h-32 w-full bg-slate-50 dark:bg-slate-800/60 rounded-none" />
        </div>
      ) : (
        <div>
          {/* ======================================================== */}
          {/* TAB 1: Platform Logo & Name */}
          {/* ======================================================== */}
          {activeSubTab === "logo-name" && (
            <div className="space-y-6">
              {/* Active Preview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-brand-primary" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Active Platform Logo & Name
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      This logo and name appear on the top-left navigation bar, receipts, invoices, and public headers.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEdit("logo-name")}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-none bg-brand-primary text-white text-xs font-bold shadow-xs hover:bg-brand-primary-hover transition cursor-pointer self-start sm:self-auto"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{editingTab["logo-name"] ? "Close Form" : "Edit Logo & Name"}</span>
                  </button>
                </div>

                {/* Preview Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-800/30 p-5 border border-slate-100 dark:border-slate-800 rounded-none">
                  {/* Logo Preview */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 rounded-none shadow-xs">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt={settings.siteName || "Logo"}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">No Logo</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs uppercase font-bold text-slate-400">Current Platform Logo</div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {settings.logoUrl ? "Custom Cloudinary Asset Loaded" : "Default Icon Active"}
                      </div>
                    </div>
                  </div>

                  {/* Name Preview */}
                  <div className="flex flex-col justify-center">
                    <div className="text-xs uppercase font-bold text-slate-400">Current Platform Name</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {settings.siteName || "PharmaBiz SaaS"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Dynamically rendered across the portal
                    </div>
                  </div>
                </div>

                {/* Navbar Live Simulation */}
                <div className="mt-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <span className="text-[11px] uppercase font-bold text-slate-400 px-2 border-r border-slate-200 dark:border-slate-700">
                    Live Header Preview
                  </span>
                  <div className="flex items-center gap-2">
                    {settings.logoUrl ? (
                      <div className="h-7 w-7 rounded-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5">
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-none bg-brand-primary flex items-center justify-center text-white text-xs font-bold">
                        P
                      </div>
                    )}
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {settings.siteName || "PharmaBiz"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Form (Hidden after save) */}
              {editingTab["logo-name"] && (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Update Platform Brand & Logo
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleEdit("logo-name", false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Platform Name Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Platform / Site Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="e.g. PharmaBiz SaaS"
                        className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm font-semibold focus:outline-none focus:border-brand-primary"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Updates the top-left navbar title, invoices, browser title, and page footers.
                      </p>
                    </div>

                    {/* Logo Uploader */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Upload Platform Logo
                      </label>
                      <ImageUploader
                        value={logoUrl}
                        publicId={logoPublicId}
                        onChange={(data) => {
                          setLogoUrl(data?.url || "");
                          setLogoPublicId(data?.publicId || "");
                        }}
                        label="Upload Brand Logo"
                        hint="PNG, JPG, SVG with transparent background recommended (Max 5MB)"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleEdit("logo-name", false)}
                      className="h-10 px-5 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("logo-name")}
                      disabled={saving}
                      className="h-10 px-6 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save & Apply</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: Dynamic Brand Color Theme */}
          {/* ======================================================== */}
          {activeSubTab === "brand-color" && (
            <div className="space-y-6">
              {/* Active Preview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-brand-primary" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Active Brand Color Theme
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sets the global CSS custom property (<code className="font-mono text-brand-primary">--primary-color</code>) across the whole SaaS.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEdit("brand-color")}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-none bg-brand-primary text-white text-xs font-bold shadow-xs hover:bg-brand-primary-hover transition cursor-pointer self-start sm:self-auto"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{editingTab["brand-color"] ? "Close Form" : "Edit Color Theme"}</span>
                  </button>
                </div>

                {/* Color Swatch Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-800/30 p-5 border border-slate-100 dark:border-slate-800 rounded-none">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-16 w-16 border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center text-white font-black text-xs rounded-none"
                      style={{ backgroundColor: settings.primaryColor || "#059669" }}
                    >
                      {settings.primaryColor}
                    </div>
                    <div>
                      <div className="text-xs uppercase font-bold text-slate-400">Current Hex Color</div>
                      <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {settings.primaryColor || "#059669"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Applied dynamically to buttons, badges, links, active tabs
                      </div>
                    </div>
                  </div>

                  {/* Interactive Button Preview */}
                  <div className="flex flex-col justify-center space-y-2">
                    <div className="text-xs uppercase font-bold text-slate-400">Theme Component Preview</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-bold text-white shadow-xs rounded-none"
                        style={{ backgroundColor: settings.primaryColor || "#059669" }}
                      >
                        Primary Button
                      </button>
                      <span
                        className="px-3 py-1 text-xs font-bold rounded-none"
                        style={{
                          backgroundColor: `${settings.primaryColor || "#059669"}15`,
                          color: settings.primaryColor || "#059669",
                        }}
                      >
                        Active Badge
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form (Hidden after save) */}
              {editingTab["brand-color"] && (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Select or Customize Brand Palette
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleEdit("brand-color", false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Preset Colors */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Curated Presets for Medical & Pharmacy SaaS
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {PRESET_COLORS.map((preset) => {
                        const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => handleColorSelect(preset.hex)}
                            className={`p-3 border text-left transition flex flex-col justify-between h-20 rounded-none cursor-pointer ${
                              isSelected
                                ? "border-slate-900 dark:border-white ring-2 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className="h-5 w-5 rounded-none shadow-xs border border-black/10 inline-block"
                                style={{ backgroundColor: preset.hex }}
                              />
                              {isSelected && <Check className="h-4 w-4 text-slate-900 dark:text-white" />}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                {preset.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{preset.hex}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Hex Picker */}
                  <div className="max-w-xs">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Or Custom HEX Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => handleColorSelect(e.target.value)}
                        className="h-10 w-12 rounded-none border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => handleColorSelect(e.target.value)}
                        placeholder="#059669"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm font-mono focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleEdit("brand-color", false)}
                      className="h-10 px-5 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("brand-color")}
                      disabled={saving}
                      className="h-10 px-6 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Theme Color</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: Landing Page Hero & Branding */}
          {/* ======================================================== */}
          {activeSubTab === "landing-hero" && (
            <div className="space-y-6">
              {/* Active Preview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-5 w-5 text-brand-primary" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Active Landing Page Hero Section
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Preview of the headline, badge, and call-to-action buttons shown on the main public portal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEdit("landing-hero")}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-none bg-brand-primary text-white text-xs font-bold shadow-xs hover:bg-brand-primary-hover transition cursor-pointer self-start sm:self-auto"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{editingTab["landing-hero"] ? "Close Form" : "Edit Hero Section"}</span>
                  </button>
                </div>

                {/* Hero Preview Box */}
                <div className="p-6 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-none text-center max-w-2xl mx-auto space-y-3">
                  <span className="inline-block px-3 py-1 text-[11px] font-bold text-brand-primary bg-brand-primary/10 rounded-none">
                    {settings.hero?.badge || "Next-Gen Multi-Tenant Pharmacy Platform"}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {settings.hero?.title || "Empower Your Pharmacy Chain With Smart Offline-First SaaS"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {settings.hero?.subtitle ||
                      "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime."}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-none shadow-xs"
                    >
                      {settings.hero?.ctaPrimaryText || "Get Started Now"}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-none"
                    >
                      {settings.hero?.ctaSecondaryText || "Explore Plans"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Form (Hidden after save) */}
              {editingTab["landing-hero"] && (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Edit Hero Copy & Call to Actions
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleEdit("landing-hero", false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hero Badge / Pill Text
                    </label>
                    <input
                      type="text"
                      value={heroBadge}
                      onChange={(e) => setHeroBadge(e.target.value)}
                      placeholder="e.g. Next-Gen Multi-Tenant Pharmacy Platform"
                      className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hero Main Title
                    </label>
                    <input
                      type="text"
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="e.g. Empower Your Pharmacy Chain With Smart Offline-First SaaS"
                      className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm font-semibold focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hero Subtitle / Description
                    </label>
                    <textarea
                      rows={3}
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Primary CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryText}
                        onChange={(e) => setCtaPrimaryText(e.target.value)}
                        placeholder="Get Started Now"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Secondary CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={ctaSecondaryText}
                        onChange={(e) => setCtaSecondaryText(e.target.value)}
                        placeholder="Explore Plans"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleEdit("landing-hero", false)}
                      className="h-10 px-5 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("landing-hero")}
                      disabled={saving}
                      className="h-10 px-6 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Hero Section</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: Dynamic Platform Features */}
          {/* ======================================================== */}
          {activeSubTab === "platform-features" && (
            <div className="space-y-6">
              {/* Active Preview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-brand-primary" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Active Platform Features ({settings.features?.length || 0})
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Highlights and capability cards showcased on the public landing page.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEdit("platform-features")}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-none bg-brand-primary text-white text-xs font-bold shadow-xs hover:bg-brand-primary-hover transition cursor-pointer self-start sm:self-auto"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{editingTab["platform-features"] ? "Close Form" : "Edit Features"}</span>
                  </button>
                </div>

                {/* Features Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(settings.features || []).map((feat, idx) => (
                    <div
                      key={feat.id || idx}
                      className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-none space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wide">
                        <Zap className="h-3.5 w-3.5" />
                        <span>Feature {idx + 1}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {feat.title}
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">
                        {feat.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Form (Hidden after save) */}
              {editingTab["platform-features"] && (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Manage Feature Capabilities
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="h-8 px-3 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Feature</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {features.map((feat, index) => (
                      <div
                        key={feat.id || index}
                        className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 rounded-none space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-brand-primary">
                            Feature Card #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(index)}
                            className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Feature Title
                            </label>
                            <input
                              type="text"
                              value={feat.title}
                              onChange={(e) => handleFeatureChange(index, "title", e.target.value)}
                              className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-bold focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Icon Keyword (e.g. Zap, Building2, ShieldAlert, CreditCard)
                            </label>
                            <input
                              type="text"
                              value={feat.icon || "Zap"}
                              onChange={(e) => handleFeatureChange(index, "icon", e.target.value)}
                              className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-mono focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={2}
                            value={feat.description}
                            onChange={(e) => handleFeatureChange(index, "description", e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleEdit("platform-features", false)}
                      className="h-10 px-5 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("platform-features")}
                      disabled={saving}
                      className="h-10 px-6 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Features</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: Company Contact & HQ Details */}
          {/* ======================================================== */}
          {activeSubTab === "company-contact" && (
            <div className="space-y-6">
              {/* Active Preview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-brand-primary" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Active Company Contact & HQ Details
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contact numbers, support mail, and physical office location for client inquiries.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEdit("company-contact")}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-none bg-brand-primary text-white text-xs font-bold shadow-xs hover:bg-brand-primary-hover transition cursor-pointer self-start sm:self-auto"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{editingTab["company-contact"] ? "Close Form" : "Edit Contact Details"}</span>
                  </button>
                </div>

                {/* Contact Preview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-5 border border-slate-100 dark:border-slate-800 rounded-none">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Official Email</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {settings.contact?.email || "support@pharmabiz.com"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Support Hotline</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {settings.contact?.phone || "+880 1700-000000"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-brand-primary" />
                      <span>HQ Address</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {settings.contact?.address || "Gulshan-2, Dhaka-1212, Bangladesh"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-bold text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Support Hours</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {settings.contact?.supportHours || "24/7 Dedicated Support"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form (Hidden after save) */}
              {editingTab["company-contact"] && (
                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Update Company Contact Information
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleEdit("company-contact", false)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Official Support Email
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="support@pharmabiz.com"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Helpline / Phone Number
                      </label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+880 1700-000000"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        HQ Office Physical Address
                      </label>
                      <input
                        type="text"
                        value={contactAddress}
                        onChange={(e) => setContactAddress(e.target.value)}
                        placeholder="Gulshan-2, Dhaka-1212, Bangladesh"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Support Operating Hours
                      </label>
                      <input
                        type="text"
                        value={supportHours}
                        onChange={(e) => setSupportHours(e.target.value)}
                        placeholder="24/7 Dedicated Support"
                        className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleEdit("company-contact", false)}
                      className="h-10 px-5 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("company-contact")}
                      disabled={saving}
                      className="h-10 px-6 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Contact Details</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ======================================================== */}
          {/* TAB 6: Payment Gateways & bKash Configuration */}
          {/* ======================================================== */}
          {activeSubTab === "payment-gateways" && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-pink-600" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        Payment Gateway & Remittance Configuration
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure dynamic payment methods for pharmacy registration (Step 3) and subscription renewals.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadGatewaySettings}
                    disabled={loadingGateways}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingGateways ? "animate-spin text-pink-600" : ""}`} />
                    <span>Reload</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gateway 1: Manual bKash Send Money */}
                  <div className={`p-5 border transition-all ${
                    gatewaySettings.manualBkash?.enabled
                      ? "border-pink-500/40 bg-pink-50/20 dark:bg-pink-950/10 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 opacity-80"
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-pink-500/10 dark:border-slate-800 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-pink-600 text-white flex items-center justify-center font-black text-sm">
                          ৳
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            bKash Send Money Gateway
                          </h3>
                          <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">
                            Manual TrxID & Screenshot Verification
                          </span>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(gatewaySettings.manualBkash?.enabled)}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              manualBkash: {
                                ...prev.manualBkash,
                                enabled: e.target.checked,
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          bKash Number (Recieving Account) *
                        </label>
                        <input
                          type="text"
                          value={gatewaySettings.manualBkash?.number || ""}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              manualBkash: {
                                ...prev.manualBkash,
                                number: e.target.value,
                              },
                            }))
                          }
                          placeholder="e.g. 01700-000000"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-pink-500 font-bold"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          The bKash phone number displayed to pharmacy owners for Send Money.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Account Type
                        </label>
                        <select
                          value={gatewaySettings.manualBkash?.type || "PERSONAL"}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              manualBkash: {
                                ...prev.manualBkash,
                                type: e.target.value,
                              },
                            }))
                          }
                          className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:border-pink-500"
                        >
                          <option value="PERSONAL">Personal Account (Send Money)</option>
                          <option value="AGENT">Agent Account (Cash Out)</option>
                          <option value="MERCHANT">Merchant Account (Payment)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Instructions for Applicant
                        </label>
                        <textarea
                          rows={3}
                          value={gatewaySettings.manualBkash?.instructions || ""}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              manualBkash: {
                                ...prev.manualBkash,
                                instructions: e.target.value,
                              },
                            }))
                          }
                          placeholder="যেকোনো বিকাশ একাউন্ট থেকে উপরে দেওয়া নম্বরে নির্ধারিত ফি Send Money করুন..."
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      {/* Live Customer Preview */}
                      <div className="p-3 bg-white dark:bg-slate-900 border border-pink-500/20 rounded-none space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                          <span>Live Customer Preview</span>
                          <span className="text-pink-600 font-bold">
                            {gatewaySettings.manualBkash?.enabled ? "Active on Portal" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-slate-500">Send Money To:</span>
                          <strong className="text-pink-600 font-bold">
                            {gatewaySettings.manualBkash?.number || "Not Set"} ({gatewaySettings.manualBkash?.type || "PERSONAL"})
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gateway 2: Automated SSLCommerz */}
                  <div className={`p-5 border transition-all ${
                    gatewaySettings.sslcommerz?.enabled
                      ? "border-sky-500/40 bg-sky-50/20 dark:bg-sky-950/10 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 opacity-80"
                  }`}>
                    <div className="flex items-center justify-between pb-3 border-b border-sky-500/10 dark:border-slate-800 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-sm">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            SSLCommerz Automated Gateway
                          </h3>
                          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                            Instant Credit Card / Internet Banking / MFS
                          </span>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(gatewaySettings.sslcommerz?.enabled)}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              sslcommerz: {
                                ...prev.sslcommerz,
                                enabled: e.target.checked,
                              },
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Store ID
                        </label>
                        <input
                          type="text"
                          value={gatewaySettings.sslcommerz?.storeId || ""}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              sslcommerz: {
                                ...prev.sslcommerz,
                                storeId: e.target.value,
                              },
                            }))
                          }
                          placeholder="e.g. testbox_live"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-sky-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Store Password
                        </label>
                        <input
                          type="password"
                          value={gatewaySettings.sslcommerz?.storePassword || ""}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              sslcommerz: {
                                ...prev.sslcommerz,
                                storePassword: e.target.value,
                              },
                            }))
                          }
                          placeholder="••••••••••••"
                          className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="ssl-sandbox"
                          checked={Boolean(gatewaySettings.sslcommerz?.isSandbox)}
                          onChange={(e) =>
                            setGatewaySettings((prev: any) => ({
                              ...prev,
                              sslcommerz: {
                                ...prev.sslcommerz,
                                isSandbox: e.target.checked,
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <label htmlFor="ssl-sandbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          Sandbox / Test Mode (Use sandbox.sslcommerz.com)
                        </label>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 border border-sky-500/20 rounded-none text-xs text-slate-500 space-y-1">
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          {gatewaySettings.sslcommerz?.enabled ? "Online Gateway Active" : "Online Gateway Disabled"}
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Requires active merchant credentials from SSLCommerz. If disabled, all payments route through manual bKash Send Money.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Bar */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={handleSaveGatewaySettings}
                    disabled={savingGateways}
                    className="h-10 px-6 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingGateways ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Payment Gateways</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
