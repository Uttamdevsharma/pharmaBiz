"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Search,
  Calendar,
  ArrowRight,
  Sparkles,
  Wrench,
  Layers,
  Bell,
  CheckCircle2,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

interface TenantNotice {
  id: number;
  title: string;
  content: string;
  type: string;
  badge_text?: string | null;
  pinned: boolean;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export function TenantNoticesPage() {
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "FEATURE" | "MAINTENANCE" | "ANNOUNCEMENT">("ALL");
  const [selectedNotice, setSelectedNotice] = useState<TenantNotice | null>(null);

  const loadNotices = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetchApi<{ notices: TenantNotice[]; unread_count: number }>(
        "/tenant/notices",
        {
          skipCache: true,
          skipProgress: !isManual,
        }
      );

      if (res.success && res.data) {
        setNotices(res.data.notices || []);
      }
    } catch (e) {
      console.error("Failed to load tenant notices", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleOpenNotice = async (notice: TenantNotice) => {
    setSelectedNotice(notice);
    if (!notice.is_read) {
      try {
        await fetchApi("/tenant/notices/mark-read", {
          method: "POST",
          body: { notice_id: notice.id },
          skipCache: true,
          skipProgress: true,
        });
        setNotices((prev) =>
          prev.map((n) => (n.id === notice.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        // silent fail
      }
    }
  };

  const filteredNotices = notices.filter((n) => {
    // Type filter
    if (activeFilter === "FEATURE" && n.type !== "FEATURE") return false;
    if (activeFilter === "MAINTENANCE" && n.type !== "MAINTENANCE") return false;
    if (activeFilter === "ANNOUNCEMENT" && n.type !== "ANNOUNCEMENT" && n.type !== "UPDATE")
      return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.badge_text && n.badge_text.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const getBorderColor = (type: string) => {
    switch (type) {
      case "MAINTENANCE":
        return "border-l-amber-500 hover:border-l-amber-600";
      case "FEATURE":
        return "border-l-blue-500 hover:border-l-blue-600";
      case "UPDATE":
        return "border-l-purple-500 hover:border-l-purple-600";
      default:
        return "border-l-emerald-500 hover:border-l-emerald-600";
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "MAINTENANCE":
        return "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40";
      case "FEATURE":
        return "bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/40";
      case "UPDATE":
        return "bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-900/40";
      default:
        return "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Notices
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Platform announcements, release updates, and maintenance schedules
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadNotices(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar & Filter Pills (Matching BizPOS) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements, releases, maintenance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("FEATURE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "FEATURE"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Features</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("MAINTENANCE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "MAINTENANCE"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>Maintenance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("ANNOUNCEMENT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "ANNOUNCEMENT"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Megaphone className="w-3 h-3" />
            <span>Announcements</span>
          </button>
        </div>
      </div>

      {/* Notices Feed Cards */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading notices...
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Megaphone className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">
              No notices found matching current filter.
            </p>
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const borderColorClass = getBorderColor(notice.type);
            const badgeClass = getTypeBadgeStyle(notice.type);

            return (
              <div
                key={notice.id}
                onClick={() => handleOpenNotice(notice)}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 ${borderColorClass} shadow-xs hover:shadow-md transition cursor-pointer space-y-2.5 relative group`}
              >
                {/* Header: Badges & Date */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Notice Type Pill */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}
                    >
                      {notice.type}
                    </span>

                    {/* Custom Badge Text */}
                    {notice.badge_text && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                        {notice.badge_text}
                      </span>
                    )}

                    {/* Unread Pill */}
                    {!notice.is_read && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-red-500 text-white animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(notice.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Notice Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-primary transition">
                  {notice.title}
                </h3>

                {/* Content Excerpt */}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {notice.content}
                </p>

                {/* Card Action Link */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-brand-primary group-hover:underline flex items-center gap-1">
                    <span>View Notice</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pop-up Dialog Modal for Full Notice Details */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
              <div className="space-y-1.5 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getTypeBadgeStyle(
                      selectedNotice.type
                    )}`}
                  >
                    {selectedNotice.type}
                  </span>
                  {selectedNotice.badge_text && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                      {selectedNotice.badge_text}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(selectedNotice.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed custom-scrollbar whitespace-pre-wrap">
              {selectedNotice.content}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
