"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  PlusCircle,
  Search,
  Calendar,
  Clock,
  Eye,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Building,
  RefreshCw,
  Sparkles,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

interface EligibleBusiness {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  verificationStatus: string;
}

interface NoticeItem {
  id: number;
  title: string;
  content: string;
  type: string;
  badge_text?: string | null;
  pinned: boolean;
  is_published: boolean;
  show_banner: boolean;
  banner_duration_days: number;
  banner_expires_at?: string | null;
  target_type: string;
  target_business_ids?: string[] | null;
  created_at: string;
  updated_at: string;
  reads_count: number;
  is_banner_active: boolean;
  remaining_banner_days: number;
}

export function SuperAdminNoticesView() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [eligibleBusinesses, setEligibleBusinesses] = useState<EligibleBusiness[]>([]);

  // Create Form State
  const [formOpen, setFormOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("ANNOUNCEMENT");
  const [badgeText, setBadgeText] = useState("");
  const [bannerDays, setBannerDays] = useState(7);
  const [targetType, setTargetType] = useState<"ALL" | "SPECIFIC">("ALL");
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [businessSearch, setBusinessSearch] = useState("");

  // Edit State
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("ANNOUNCEMENT");
  const [editBadgeText, setEditBadgeText] = useState("");
  const [editBannerDays, setEditBannerDays] = useState(7);
  const [editTargetType, setEditTargetType] = useState<"ALL" | "SPECIFIC">("ALL");
  const [editSelectedBusinessIds, setEditSelectedBusinessIds] = useState<string[]>([]);
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // In-app Delete Confirmation Modal State (replaces native window.confirm)
  const [noticeToDelete, setNoticeToDelete] = useState<NoticeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-dismiss status messages
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Load notices and businesses
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [noticesRes, businessesRes] = await Promise.all([
        fetchApi<{ notices: NoticeItem[]; metrics: any }>("/super-admin/notices", {
          skipCache: true,
          skipProgress: !isManual,
        }),
        fetchApi<EligibleBusiness[]>("/super-admin/notices/eligible-businesses", {
          skipCache: true,
          skipProgress: true,
        }),
      ]);

      if (noticesRes.success && noticesRes.data) {
        setNotices(noticesRes.data.notices || []);
      }
      if (businessesRes.success && Array.isArray(businessesRes.data)) {
        setEligibleBusinesses(businessesRes.data);
      }
    } catch (err) {
      console.error("Failed to load notices data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setStatusMessage({ type: "error", text: "Please fill in both notice title and content." });
      return;
    }

    if (targetType === "SPECIFIC" && selectedBusinessIds.length === 0) {
      setStatusMessage({ type: "error", text: "Please select at least one specific pharmacy shop." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi("/super-admin/notices", {
        method: "POST",
        body: {
          title: title.trim(),
          content: content.trim(),
          type,
          badge_text: badgeText.trim() || null,
          banner_duration_days: bannerDays,
          target_type: targetType,
          target_business_ids: targetType === "SPECIFIC" ? selectedBusinessIds : null,
          is_published: true,
          show_banner: true,
        },
      });

      if (res.success) {
        // Reset form
        setTitle("");
        setContent("");
        setBadgeText("");
        setType("ANNOUNCEMENT");
        setBannerDays(7);
        setTargetType("ALL");
        setSelectedBusinessIds([]);
        setStatusMessage({ type: "success", text: "Notice published successfully!" });
        loadData(true);
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to publish notice" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error publishing notice" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (!noticeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchApi(`/super-admin/notices/${noticeToDelete.id}`, {
        method: "DELETE",
      });
      if (res.success) {
        setNotices((prev) => prev.filter((n) => n.id !== noticeToDelete.id));
        setStatusMessage({ type: "success", text: "Notice deleted successfully" });
        setNoticeToDelete(null);
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to delete notice" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error deleting notice" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (notice: NoticeItem) => {
    try {
      const updatedStatus = !notice.is_published;
      const res = await fetchApi(`/super-admin/notices/${notice.id}`, {
        method: "PUT",
        body: { is_published: updatedStatus },
      });
      if (res.success) {
        setNotices((prev) =>
          prev.map((n) => (n.id === notice.id ? { ...n, is_published: updatedStatus } : n))
        );
      }
    } catch (err) {
      console.error("Failed to toggle publish status", err);
    }
  };

  const startEdit = (notice: NoticeItem) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditType(notice.type);
    setEditBadgeText(notice.badge_text || "");
    setEditBannerDays(notice.banner_duration_days || 7);
    setEditTargetType((notice.target_type as "ALL" | "SPECIFIC") || "ALL");
    setEditSelectedBusinessIds(
      Array.isArray(notice.target_business_ids) ? (notice.target_business_ids as string[]) : []
    );
    setEditIsPublished(notice.is_published);
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;

    setEditSubmitting(true);
    try {
      const res = await fetchApi(`/super-admin/notices/${editingNotice.id}`, {
        method: "PUT",
        body: {
          title: editTitle.trim(),
          content: editContent.trim(),
          type: editType,
          badge_text: editBadgeText.trim() || null,
          banner_duration_days: editBannerDays,
          target_type: editTargetType,
          target_business_ids: editTargetType === "SPECIFIC" ? editSelectedBusinessIds : null,
          is_published: editIsPublished,
        },
      });

      if (res.success) {
        setEditingNotice(null);
        setStatusMessage({ type: "success", text: "Notice updated successfully" });
        loadData(true);
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to update notice" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error updating notice" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.badge_text && n.badge_text.toLowerCase().includes(q))
    );
  });

  const filteredBusinesses = eligibleBusinesses.filter((b) => {
    if (!businessSearch.trim()) return true;
    const q = businessSearch.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.phone && b.phone.toLowerCase().includes(q)) ||
      (b.email && b.email.toLowerCase().includes(q))
    );
  });

  const toggleBusinessSelection = (id: string) => {
    setSelectedBusinessIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleEditBusinessSelection = (id: string) => {
    setEditSelectedBusinessIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Platform Notices & Announcements</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Broadcast top marquee banners and notices to all or specific pharmacy tenants
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Create New Notice Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-left font-bold text-sm text-slate-900 dark:text-white cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>Create New Notice</span>
          </div>
          {formOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {formOpen && (
          <form onSubmit={handleCreateNotice} className="p-5 sm:p-6 space-y-5">
            {/* Title & Banner Duration */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notice Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled System Maintenance / New Medicine Stock Module Live"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Banner Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={bannerDays}
                  onChange={(e) => setBannerDays(parseInt(e.target.value, 10) || 7)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {/* Notice Type & Custom Badge Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notice Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition cursor-pointer"
                >
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="FEATURE">Feature Release</option>
                  <option value="UPDATE">System Update</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom Badge Text (Optional)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. Urgent, Important, Hot, Scheduled, Welcome"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Audience
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    targetType === "ALL"
                      ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 text-teal-900 dark:text-teal-200 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "ALL"}
                    onChange={() => setTargetType("ALL")}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <div className="text-xs">
                    <span className="block font-bold">All Active Tenants</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Notice slides on every pharmacy owner dashboard
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    targetType === "SPECIFIC"
                      ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 text-teal-900 dark:text-teal-200 font-bold"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "SPECIFIC"}
                    onChange={() => setTargetType("SPECIFIC")}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <div className="text-xs">
                    <span className="block font-bold">Specific Tenants</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Choose specific pharmacy stores ({selectedBusinessIds.length} selected)
                    </span>
                  </div>
                </label>
              </div>

              {/* Specific Pharmacy Multi-Selector */}
              {targetType === "SPECIFIC" && (
                <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Select Pharmacies ({selectedBusinessIds.length}/{eligibleBusinesses.length}):
                    </div>
                    <input
                      type="text"
                      placeholder="Search shop by name/phone..."
                      value={businessSearch}
                      onChange={(e) => setBusinessSearch(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {filteredBusinesses.map((b) => {
                      const isSelected = selectedBusinessIds.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => toggleBusinessSelection(b.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-100 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200 font-bold"
                              : "hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-teal-600 focus:ring-teal-500 pointer-events-none"
                            />
                            <span>{b.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {b.phone || b.email || b.id.slice(0, 8)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notice Content */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Notice Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write clear instructions, new release details, or maintenance schedule..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
                <span>Publish Notice</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Published Notices Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Section Header with Search */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Published Notices
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Total: {notices.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search published notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Notices Cards List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Loading notices...
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              No notices published yet or matching search criteria.
            </div>
          ) : (
            filteredNotices.map((n) => {
              return (
                <div
                  key={n.id}
                  className="p-5 hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition space-y-3"
                >
                  {/* Top Badges & Actions */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50">
                        {n.type}
                      </span>

                      {/* Custom Badge */}
                      {n.badge_text && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
                          {n.badge_text}
                        </span>
                      )}

                      {/* Target Audience Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                        <Building className="w-3 h-3 text-slate-400" />
                        {n.target_type === "ALL"
                          ? "All Active Tenants"
                          : `Specific (${(n.target_business_ids || []).length} Shops)`}
                      </span>

                      {/* Banner Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                          n.is_banner_active
                            ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {n.is_banner_active
                          ? `Top Banner Active (${n.remaining_banner_days} Days)`
                          : "Banner Inactive / Expired"}
                      </span>
                    </div>

                    {/* Published Toggle & Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(n)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          n.is_published
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {n.is_published ? "Published" : "Draft"}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(n)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Notice"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setNoticeToDelete(n)}
                        className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {n.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {n.content}
                    </p>
                  </div>

                  {/* Footer Meta: Created at & Views */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 font-semibold">
                      <Eye className="w-3.5 h-3.5 text-teal-600" />
                      {n.reads_count} {n.reads_count === 1 ? "view" : "views"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Notice Modal */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                <span>Edit Notice</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateNotice} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="FEATURE">Feature Release</option>
                    <option value="UPDATE">System Update</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Badge</label>
                  <input
                    type="text"
                    value={editBadgeText}
                    onChange={(e) => setEditBadgeText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Content</label>
                <textarea
                  rows={4}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsPublished}
                    onChange={(e) => setEditIsPublished(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Published</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern In-App Delete Confirmation Modal (No browser alert) */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Trash icon with soft red glow */}
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner ring-4 ring-red-50 dark:ring-red-900/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Delete Notice?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                Are you sure you want to permanently delete{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200 break-words">
                  "{noticeToDelete.title}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            {/* Buttons: Cancel & Confirm Delete */}
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoticeToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteNotice}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md shadow-red-600/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
