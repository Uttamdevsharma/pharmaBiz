"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Bell, CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

export function NotificationsTab() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/notifications");
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchApi("/notifications/read-all", { method: "PATCH" });
      if (res.success) {
        await loadNotifications();
      }
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Platform Notifications</h2>
          <p className="text-sm text-slate-500">System alerts, tenant onboarding logs, and critical operational events</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
        >
          Mark All As Read
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  n.isRead
                    ? "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                }`}
              >
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-xs shrink-0">
                  <Bell className="h-4 w-4 text-brand-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">All Systems Operational</div>
            <p className="text-xs text-slate-500">No unread alerts or critical platform notices at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
