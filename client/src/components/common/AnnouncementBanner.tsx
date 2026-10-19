"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, X, Calendar, ArrowRight, Bell, ExternalLink } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "@/components/dashboard/DashboardSidebar";

interface BannerNotice {
  id: number;
  title: string;
  content: string;
  type: string;
  badge_text?: string | null;
  is_read: boolean;
  created_at: string;
}

interface AnnouncementBannerProps {
  onNavigate?: (module: OwnerModule) => void;
}

export function AnnouncementBanner({ onNavigate }: AnnouncementBannerProps) {
  const [bannerNotices, setBannerNotices] = useState<BannerNotice[]>([]);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [selectedNotice, setSelectedNotice] = useState<BannerNotice | null>(null);

  const fetchBannerNotices = async () => {
    try {
      const res = await fetchApi<{
        banner_notices?: BannerNotice[];
      }>("/tenant/notices", {
        skipCache: true,
        skipProgress: true,
      });

      if (res.success && res.data?.banner_notices) {
        const notices = res.data.banner_notices;
        if (notices.length === 0) {
          setBannerNotices([]);
          setIsDismissed(true);
          return;
        }

        // Check sessionStorage for dismissed notice IDs
        let dismissedIds: number[] = [];
        try {
          const raw = sessionStorage.getItem("dismissed_announcement_ids");
          if (raw) dismissedIds = JSON.parse(raw);
        } catch (e) {
          dismissedIds = [];
        }

        const activeNotices = notices.filter((n) => !dismissedIds.includes(n.id));
        setBannerNotices(activeNotices);
        setIsDismissed(activeNotices.length === 0);
      }
    } catch (e) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchBannerNotices();
    const interval = setInterval(fetchBannerNotices, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    try {
      const ids = bannerNotices.map((n) => n.id);
      sessionStorage.setItem("dismissed_announcement_ids", JSON.stringify(ids));
    } catch (e) {
      // ignore
    }
    setIsDismissed(true);
  };

  const handleOpenNotice = async (notice: BannerNotice) => {
    setSelectedNotice(notice);
    if (!notice.is_read) {
      try {
        await fetchApi("/tenant/notices/mark-read", {
          method: "POST",
          body: { notice_id: notice.id },
          skipCache: true,
          skipProgress: true,
        });
        setBannerNotices((prev) =>
          prev.map((n) => (n.id === notice.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        // silent fail
      }
    }
  };

  if (isDismissed || bannerNotices.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative z-30 w-full bg-red-600 dark:bg-red-700 text-white flex items-center h-9 px-2 sm:px-3 text-xs shadow-xs border-b border-red-700/60 overflow-hidden select-none">
        {/* Left Fixed Badge: NOTICE + Pulsing Megaphone */}
        <div className="flex items-center gap-1.5 bg-red-800/90 hover:bg-red-800 text-white font-black px-2.5 py-0.5 rounded shadow-xs shrink-0 z-10 uppercase tracking-wider text-[11px] ring-1 ring-white/10 cursor-default">
          <Megaphone className="w-3.5 h-3.5 text-yellow-300 animate-pulse shrink-0" />
          <span>NOTICE</span>
        </div>

        {/* Middle Sliding Marquee Container */}
        <div className="flex-1 overflow-hidden relative mx-3 h-full flex items-center">
          <div className="notice-marquee-track cursor-pointer py-1">
            {bannerNotices.map((notice, idx) => {
              const badge = notice.badge_text || notice.type;
              return (
                <span
                  key={notice.id}
                  onClick={() => handleOpenNotice(notice)}
                  className="inline-flex items-center gap-2 hover:underline transition mx-4 text-[12px] font-medium"
                >
                  {badge && (
                    <span className="bg-red-950/70 text-yellow-300 font-extrabold px-1.5 py-0.2 rounded text-[10px] uppercase tracking-wide border border-yellow-300/30">
                      [{badge}]
                    </span>
                  )}
                  <span className="font-semibold tracking-wide text-white">
                    {notice.title}
                  </span>
                  <span className="text-red-200 text-[11px] font-normal underline underline-offset-2">
                    (Click to Read)
                  </span>
                  {idx < bannerNotices.length - 1 && (
                    <span className="mx-3 text-red-300/80 font-black">•</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right Action: Close/Dismiss Button */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-red-100 hover:text-white hover:bg-red-800/70 rounded transition cursor-pointer"
            title="Dismiss banner for current session"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pop-up Dialog Modal for Full Notice Reading */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
              <div className="space-y-1.5 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                    {selectedNotice.badge_text || selectedNotice.type}
                  </span>
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
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
              {onNavigate ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotice(null);
                    onNavigate("notices" as OwnerModule);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  <span>View All Notices</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
