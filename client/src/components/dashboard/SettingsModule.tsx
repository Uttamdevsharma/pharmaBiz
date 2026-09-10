"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  Building2,
  Receipt,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Camera,
  Phone,
  Mail,
  MapPin,
  FileText,
  X,
  Pencil,
  Sparkles,
  ExternalLink,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TenantProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  logoPublicId: string | null;
}

interface PharmacySettings {
  receiptHeaderNote: string;
  receiptFooterNote: string;
  prescriptionRequiredMessage: string;
}

const DEFAULT_PHARMACY_SETTINGS: PharmacySettings = {
  receiptHeaderNote: "Thank you for shopping with us. Get well soon!",
  receiptFooterNote:
    "Items can be returned within 48 hours with original invoice and valid prescription.",
  prescriptionRequiredMessage:
    "⚠️ This product requires a valid doctor's prescription. Please provide the prescription reference number or doctor's name before completing the purchase.",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
        active
          ? "bg-brand-primary text-white shadow-md"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SaveBar({
  saving,
  saved,
  error,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
      <div>
        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Saved successfully!
          </div>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-xl shadow transition active:scale-95 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Tab 1: Company Profile ───────────────────────────────────────────────────
function CompanyProfileTab() {
  const { user, updateTenantBranding } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [savedProfile, setSavedProfile] = useState<TenantProfile>({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    logoUrl: null,
    logoPublicId: null,
  });

  const [editForm, setEditForm] = useState<TenantProfile>({
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    logoUrl: null,
    logoPublicId: null,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<TenantProfile>("/tenant/profile");
      if (res.success && res.data) {
        const d = res.data as any;
        const loaded: TenantProfile = {
          id: d.id || "",
          name: d.name || "",
          email: d.email || "",
          phone: d.phone || "",
          address: d.address || "",
          logoUrl: d.logoUrl || null,
          logoPublicId: d.logoPublicId || null,
        };
        setSavedProfile(loaded);
        setEditForm(loaded);
        if (d.logoUrl) setLogoPreview(d.logoUrl);
        updateTenantBranding({
          name: d.name || "",
          logoUrl: d.logoUrl || null,
          logoPublicId: d.logoPublicId || null,
          email: d.email || null,
          phone: d.phone || null,
          address: d.address || null,
        });
      }
    } catch (e: any) {
      setError(e.message || "Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleStartEdit = () => {
    setEditForm({ ...savedProfile });
    setLogoPreview(savedProfile.logoUrl);
    setError(null);
    setSaveSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditForm({ ...savedProfile });
    setLogoPreview(savedProfile.logoUrl);
    setError(null);
    setIsEditing(false);
  };

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    // Show temporary local preview while uploading to Cloudinary
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setUploadingLogo(true);
      setError(null);

      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      // Upload directly to Cloudinary via backend upload endpoint
      const res = await fetchApi<{ url: string; publicId: string }>("/upload/image", {
        method: "POST",
        body: JSON.stringify({
          image: base64,
          folder: "pharmacy_saas/logos",
          oldPublicId: editForm.logoPublicId || undefined,
        }),
      });

      if (!res.success || !res.data) throw new Error(res.message || "Logo upload to Cloudinary failed.");

      const { url, publicId } = res.data as any;
      setEditForm((prev) => ({ ...prev, logoUrl: url, logoPublicId: publicId }));
      setLogoPreview(url);
    } catch (e: any) {
      setError(e.message || "Cloudinary logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      setError("Pharmacy / Legal name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetchApi("/tenant/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email?.trim() || undefined,
          phone: editForm.phone?.trim() || undefined,
          address: editForm.address?.trim() || undefined,
          logoUrl: editForm.logoUrl || "",
          logoPublicId: editForm.logoPublicId || "",
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to save profile");

      const updated: TenantProfile = {
        ...editForm,
        name: editForm.name.trim(),
        email: editForm.email?.trim() || null,
        phone: editForm.phone?.trim() || null,
        address: editForm.address?.trim() || null,
        logoUrl: editForm.logoUrl || null,
        logoPublicId: editForm.logoPublicId || null,
      };

      setSavedProfile(updated);
      updateTenantBranding({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        logoUrl: updated.logoUrl,
        logoPublicId: updated.logoPublicId,
      });

      setSaveSuccess("Pharmacy profile & logo saved successfully to database and Cloudinary!");
      setIsEditing(false);

      setTimeout(() => {
        setSaveSuccess(null);
      }, 5000);
    } catch (e: any) {
      setError(e.message || "Failed to save company profile");
    } finally {
      setSaving(false);
    }
  };

  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button
            onClick={() => setSaveSuccess(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 text-rose-600 hover:text-rose-800 dark:hover:text-rose-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. "CURRENT PHARMACY PROFILE" PREVIEW VIEW                                 */}
      {/* ========================================================================= */}
      {!isEditing && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            {/* Top Bar with Title and Edit Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-primary" />
                    <span>Current Pharmacy Profile</span>
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Branding Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This profile and logo are saved in your database and served globally via Cloudinary CDN.
                </p>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-4 py-2.5 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Profile & Logo</span>
                </button>
              )}
            </div>

            {/* Profile Overview Card */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Logo Box */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden shadow-inner p-2">
                  {savedProfile.logoUrl ? (
                    <img
                      src={savedProfile.logoUrl}
                      alt={savedProfile.name || "Pharmacy logo"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-center">
                      <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-1" />
                      <span className="text-[10px] font-semibold">No logo uploaded</span>
                    </div>
                  )}
                </div>
                {savedProfile.logoUrl && (
                  <span className="mt-2 block text-center text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Cloudinary CDN
                  </span>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Pharmacy / Legal Name
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {savedProfile.name || "Unnamed Pharmacy"}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Phone */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> Phone Number
                    </span>
                    <strong className="font-mono font-bold text-slate-900 dark:text-white block truncate">
                      {savedProfile.phone || "Not configured"}
                    </strong>
                  </div>

                  {/* Email */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" /> Email Address
                    </span>
                    <strong className="font-bold text-slate-900 dark:text-white block truncate">
                      {savedProfile.email || "Not configured"}
                    </strong>
                  </div>

                  {/* Address */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" /> Store Address
                    </span>
                    <strong className="font-medium text-slate-900 dark:text-white block line-clamp-2">
                      {savedProfile.address || "Not configured"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Branding Broadcast Note */}
            <div className="p-4 rounded-2xl bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/15 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Dynamic Branding In Effect:</strong> This logo and pharmacy name are automatically rendered on POS sales invoices, thermal customer receipts, branch sales telemetry, and the top navigation header.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLEAN EDIT & UPLOAD FORM VIEW                                          */}
      {/* ========================================================================= */}
      {isEditing && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-brand-primary" />
                  <span>Edit Pharmacy Profile & Branding</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Update your official pharmacy details. Changes will immediately sync across your workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Logo Upload Section */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="h-4 w-4 text-brand-primary" />
                  Pharmacy Logo (Cloudinary CDN)
                </span>
                <span className="text-[10px] text-slate-400">JPG, PNG, WEBP &bull; Max 5MB</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Logo Frame */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-2 shadow-xs">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Pharmacy logo preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    )}

                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl text-[10px] font-bold text-brand-primary gap-1">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Uploading…</span>
                      </div>
                    )}
                  </div>

                  {logoPreview && !uploadingLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setEditForm((prev) => ({ ...prev, logoUrl: null, logoPublicId: null }));
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow hover:bg-rose-600 transition"
                      title="Remove Logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Upload Button and Info */}
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload your high-resolution pharmacy brand logo. Saved assets are permanently stored on Cloudinary.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingLogo ? "Uploading to Cloudinary..." : "Choose Image File"}</span>
                    </button>

                    {editForm.logoUrl && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Cloudinary asset linked
                      </span>
                    )}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4">
              {/* Legal Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pharmacy / Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Shapla Pharmacy Ltd."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" /> Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 01700-000000"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. info@shaplapharma.com"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" /> Store / Legal Address
                </label>
                <textarea
                  rows={2}
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. House #14, Road #5, Dhanmondi, Dhaka-1205, Bangladesh"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploadingLogo}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:opacity-90 text-white text-xs font-bold rounded-xl shadow transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? "Saving Changes…" : "Save Pharmacy Profile"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Receipt & Invoice ─────────────────────────────────────────────────
function ReceiptInvoiceTab() {
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULT_PHARMACY_SETTINGS);
  const [profile, setProfile] = useState<Partial<TenantProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          fetchApi<PharmacySettings>("/settings/pharmacy"),
          fetchApi<TenantProfile>("/tenant/profile"),
        ]);
        if (settingsRes.success && settingsRes.data) {
          setSettings({ ...DEFAULT_PHARMACY_SETTINGS, ...(settingsRes.data as any) });
        }
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data as any);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi("/settings/pharmacy", {
        method: "PUT",
        body: JSON.stringify({
          receiptHeaderNote: settings.receiptHeaderNote,
          receiptFooterNote: settings.receiptFooterNote,
        }),
      });
      if (!res.success) throw new Error(res.message || "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save receipt settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const now = new Date();
  const invoiceDate = now.toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const invoiceTime = now.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Settings Inputs */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand-primary" />
          Receipt / Invoice Notes
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Header Greeting (shown at top of invoice)
          </label>
          <input
            type="text"
            value={settings.receiptHeaderNote}
            onChange={(e) => setSettings((s) => ({ ...s, receiptHeaderNote: e.target.value }))}
            maxLength={120}
            placeholder="e.g. Thank you for shopping with us!"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Footer Note / Return Policy (shown at bottom of invoice)
          </label>
          <textarea
            rows={2}
            value={settings.receiptFooterNote}
            onChange={(e) => setSettings((s) => ({ ...s, receiptFooterNote: e.target.value }))}
            maxLength={220}
            placeholder="e.g. Items can be returned within 48 hours with invoice and valid prescription."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
          />
        </div>

        <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
      </div>

      {/* Live Invoice Preview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Invoice Preview (Sample)
        </h3>

        <div className="max-w-sm mx-auto border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 text-[11px] space-y-3 shadow-sm">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-3 space-y-1.5">
            {profile.logoUrl && (
              <div className="flex justify-center mb-2">
                <img
                  src={profile.logoUrl}
                  alt="Pharmacy logo"
                  className="h-12 object-contain"
                />
              </div>
            )}
            <div className="font-black text-sm text-slate-900 dark:text-white uppercase">
              {profile.name || "Your Pharmacy Name"}
            </div>
            {settings.receiptHeaderNote && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold italic">
                {settings.receiptHeaderNote}
              </p>
            )}
            {profile.address && (
              <p className="text-[10px] text-slate-500">{profile.address}</p>
            )}
            {(profile.phone || profile.email) && (
              <p className="text-[10px] text-slate-500">
                {profile.phone && `Tel: ${profile.phone}`}
                {profile.phone && profile.email && " | "}
                {profile.email && `Email: ${profile.email}`}
              </p>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="flex justify-between text-[10px] text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <div>
                <span className="font-bold">Invoice #:</span> INV-000001
              </div>
              <div>
                <span className="font-bold">Customer:</span> Walk-in Customer
              </div>
              <div>
                <span className="font-bold">Cashier:</span> Demo Cashier
              </div>
            </div>
            <div className="text-right">
              <div>
                <span className="font-bold">Date:</span> {invoiceDate}
              </div>
              <div>
                <span className="font-bold">Time:</span> {invoiceTime}
              </div>
              <div>
                <span className="font-bold">Payment:</span> Cash
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase">
                <th className="pb-1 text-left font-bold">Product</th>
                <th className="pb-1 text-center font-bold">Batch</th>
                <th className="pb-1 text-center font-bold">Unit</th>
                <th className="pb-1 text-center font-bold">Qty</th>
                <th className="pb-1 text-right font-bold">Price</th>
                <th className="pb-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-1 font-semibold">Napa Tablet 500mg</td>
                <td className="py-1 text-center text-slate-400">B-2024</td>
                <td className="py-1 text-center text-slate-400">Strip</td>
                <td className="py-1 text-center font-bold">2</td>
                <td className="py-1 text-right">৳10.00</td>
                <td className="py-1 text-right font-bold">৳20.00</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Simepar Syrup</td>
                <td className="py-1 text-center text-slate-400">B-2025</td>
                <td className="py-1 text-center text-slate-400">Bottle</td>
                <td className="py-1 text-center font-bold">1</td>
                <td className="py-1 text-right">৳85.00</td>
                <td className="py-1 text-right font-bold">৳85.00</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 space-y-0.5">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>৳105.00</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Discount:</span>
              <span>-৳5.00</span>
            </div>
            <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white">
              <span>Grand Total:</span>
              <span>৳100.00</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Paid (Cash):</span>
              <span>৳100.00</span>
            </div>
            <div className="flex justify-between text-blue-600 font-bold">
              <span>Change:</span>
              <span>৳0.00</span>
            </div>
          </div>

          {/* Footer */}
          {settings.receiptFooterNote && (
            <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 text-center text-[10px] text-slate-400 italic">
              {settings.receiptFooterNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Prescription Settings ─────────────────────────────────────────────
function PrescriptionSettingsTab() {
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULT_PHARMACY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi<PharmacySettings>("/settings/pharmacy");
        if (res.success && res.data) {
          setSettings({ ...DEFAULT_PHARMACY_SETTINGS, ...(res.data as any) });
        }
      } catch (e: any) {
        setError(e.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi("/settings/pharmacy", {
        method: "PUT",
        body: JSON.stringify({
          prescriptionRequiredMessage: settings.prescriptionRequiredMessage,
        }),
      });
      if (!res.success) throw new Error(res.message || "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save prescription settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-primary" />
          Prescription Required Warning
        </h3>

        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
          <strong>How it works:</strong> When a product has{" "}
          <em>"Requires Doctor Prescription"</em> enabled, this message is shown prominently in the
          POS cart before the cashier can complete the sale. Customize it to match your pharmacy's
          policy.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Prescription Warning Message
          </label>
          <textarea
            rows={4}
            value={settings.prescriptionRequiredMessage}
            onChange={(e) =>
              setSettings((s) => ({ ...s, prescriptionRequiredMessage: e.target.value }))
            }
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Tip: Start with ⚠️ or 🔴 for visibility. Keep it clear and easy to understand for
            cashiers.
          </p>
        </div>

        {/* Live Preview */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Preview (as shown in POS):</p>
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
            <div className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-4 w-4" />
              Prescription Verification Required
            </div>
            <p className="text-[11px] text-rose-600/90 dark:text-rose-400">
              {settings.prescriptionRequiredMessage ||
                "(Message will appear here as typed above)"}
            </p>
            <div className="mt-2">
              <label className="block text-[10px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                Doctor Name / Prescription Ref # *
              </label>
              <div className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg text-xs text-slate-400">
                e.g. Dr. K. Rahman — Ref #Rx-8391
              </div>
            </div>
          </div>
        </div>

        <SaveBar saving={saving} saved={saved} error={error} onSave={handleSave} />
      </div>

      {/* Info about prescription field */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-700 dark:text-slate-300">Related Product Setting:</p>
        <p>
          To mark a product as prescription-required, go to{" "}
          <span className="font-semibold text-brand-primary">
            Inventory → Products → Edit Product
          </span>{" "}
          and enable the <em>"Requires Doctor Prescription"</em> toggle. The warning above will
          then automatically appear in POS whenever that product is added to the cart.
        </p>
      </div>
    </div>
  );
}

// ─── Main Settings Module ─────────────────────────────────────────────────────
export function SettingsModule() {
  const [activeTab, setActiveTab] = useState<"profile" | "receipt" | "prescription">("profile");

  const tabs = [
    { id: "profile" as const, label: "Company Profile", icon: Building2 },
    { id: "receipt" as const, label: "Receipt & Invoice", icon: Receipt },
    { id: "prescription" as const, label: "Prescription Settings", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span>Dashboard</span>
          <span>/</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">Settings</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <FileText className="h-6 w-6 text-brand-primary" />
          Pharmacy Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your pharmacy profile, invoice format, and dispensing preferences.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && <CompanyProfileTab />}
      {activeTab === "receipt" && <ReceiptInvoiceTab />}
      {activeTab === "prescription" && <PrescriptionSettingsTab />}
    </div>
  );
}
