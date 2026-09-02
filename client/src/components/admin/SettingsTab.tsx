"use client";

import React, { useState } from "react";
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

export function SettingsTab() {
  const { settings, refreshSettings } = useSettings();

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state initialized with current settings
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

  const handleColorSelect = (hex: string) => {
    setPrimaryColor(hex);
    // Instant live preview
    document.documentElement.style.setProperty("--primary-color", hex);
  };

  const handleAddFeature = () => {
    setFeatures([
      ...features,
      {
        id: `feat-${Date.now()}`,
        title: "New Pharmacy Capability",
        description: "Describe how this feature boosts store efficiency and offline reliability.",
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setSuccessMessage("Theme, branding, and Cloudinary media saved! Changes are now live on the public landing page.");
        await refreshSettings();
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
    <form onSubmit={handleSaveSettings} className="space-y-8 max-w-5xl">
      {/* Header & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Branding, Content & Dynamic Theme
          </h2>
          <p className="text-sm text-slate-500">
            Customize platform logo, Cloudinary media assets, dynamic primary color palette, and live landing content
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:opacity-90 transition active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save & Apply Changes
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Cloudinary Logo & Media Asset Uploader */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 rounded-xl brand-subtle-bg text-brand-primary">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Platform Logo & Media (Cloudinary)</h3>
            <p className="text-xs text-slate-500">
              Upload company brand logo and imagery directly to Cloudinary with automated optimization
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ImageUploader
              label="Platform / Company Logo"
              hint="Upload brand logo for Navbar and Header. Stored in Cloudinary."
              value={logoUrl}
              publicId={logoPublicId}
              folder="pharmacy_saas/logos"
              onChange={(data) => {
                setLogoUrl(data?.url || "");
                setLogoPublicId(data?.publicId || "");
              }}
            />
          </div>

          <div className="flex flex-col justify-center space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500">
            <div className="font-bold text-slate-700 dark:text-slate-300">Cloudinary Media Rules:</div>
            <div>• Automated image compression and WebP format delivery.</div>
            <div>• Replacing an existing logo automatically destroys the previous Cloudinary asset.</div>
            <div>• Real-time synchronization to Public Navbar, Footer, and Admin Portal.</div>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Primary Theme Palette */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 rounded-xl brand-subtle-bg text-brand-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dynamic Brand Color Theme</h3>
            <p className="text-xs text-slate-500">
              Select or enter a primary brand color. It dynamically drives buttons, gradients, icons, and glows.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Choose a Preset Theme Palette
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {PRESET_COLORS.map((preset) => {
              const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  type="button"
                  key={preset.hex}
                  onClick={() => handleColorSelect(preset.hex)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? "border-2 border-slate-900 dark:border-white shadow-md scale-105"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  }`}
                >
                  <span
                    className="h-8 w-8 rounded-full shadow-inner border border-white/20"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{preset.hex}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custom HEX Color Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  placeholder="#059669"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Live Preview Button */}
            <div className="pt-5">
              <span
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Sparkles className="h-4 w-4" />
                Live Theme Preview
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Platform Branding & Hero Content */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 rounded-xl brand-subtle-bg text-brand-primary">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Landing Page Hero & Branding</h3>
            <p className="text-xs text-slate-500">Edit company title, hero headline, badges, and action buttons</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Platform / Company Name
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hero Top Badge Pill
            </label>
            <input
              type="text"
              value={heroBadge}
              onChange={(e) => setHeroBadge(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Main Hero Headline Title
            </label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary font-semibold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hero Subtitle / Description
            </label>
            <textarea
              rows={3}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary CTA Button Text
            </label>
            <input
              type="text"
              value={ctaPrimaryText}
              onChange={(e) => setCtaPrimaryText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Secondary CTA Button Text
            </label>
            <input
              type="text"
              value={ctaSecondaryText}
              onChange={(e) => setCtaSecondaryText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
      </div>

      {/* 4. Dynamic Features Editor */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dynamic Platform Features</h3>
            <p className="text-xs text-slate-500">Edit, add, or remove feature cards shown on the landing page</p>
          </div>

          <button
            type="button"
            onClick={handleAddFeature}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Add Feature
          </button>
        </div>

        <div className="space-y-4">
          {features.map((feat, idx) => (
            <div
              key={feat.id || idx}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Feature #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  title="Remove Feature"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <input
                    type="text"
                    value={feat.title}
                    onChange={(e) => handleFeatureChange(idx, "title", e.target.value)}
                    placeholder="Feature Title"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <select
                    value={feat.icon || "Zap"}
                    onChange={(e) => handleFeatureChange(idx, "icon", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                  >
                    <option value="Zap">Zap (Offline / Fast)</option>
                    <option value="Building2">Building2 (Multi-Branch)</option>
                    <option value="ShieldAlert">ShieldAlert (Inventory/Expiry)</option>
                    <option value="ArrowLeftRight">ArrowLeftRight (Transfers)</option>
                    <option value="ShieldCheck">ShieldCheck (RBAC Security)</option>
                    <option value="CreditCard">CreditCard (Payments)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <textarea
                    rows={2}
                    value={feat.description}
                    onChange={(e) => handleFeatureChange(idx, "description", e.target.value)}
                    placeholder="Feature Description"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Contact & Support Details */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Company Contact & HQ Details</h3>
          <p className="text-xs text-slate-500">Displayed in the public website contact section and footer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Support Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Support Phone
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Office Address
            </label>
            <input
              type="text"
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Support Availability Hours
            </label>
            <input
              type="text"
              value={supportHours}
              onChange={(e) => setSupportHours(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
