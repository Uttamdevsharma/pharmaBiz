"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Smartphone,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  CheckSquare,
  Square,
} from "lucide-react";
import Swal from "sweetalert2";

interface Recipient {
  id: string | number;
  pharmacy_name: string;
  owner_name: string;
  phone: string;
  email: string;
  status: string;
  plan_name: string;
  expiry_date: string;
  due_amount: number;
  category: "ACTIVE" | "EXPIRED" | "DEMO" | "PENDING";
}

const TEMPLATES = [
  {
    id: "due",
    label: "Due Reminder",
    subject: "Important: PharmaBiz Subscription Renewal Notice - {pharmacy_name}",
    message:
      "Dear {owner_name}, your PharmaBiz subscription for {pharmacy_name} ({plan_name}) expires on {expiry_date}. Please renew to prevent service interruption. Due: ৳ {due_amount}. Login: {portal_url}",
  },
  {
    id: "offer",
    label: "Upgrade Offer",
    subject: "Exclusive Offer: Upgrade your PharmaBiz Trial at 30% Off!",
    message:
      "Hello {owner_name}! Upgrade your trial for {pharmacy_name} to our yearly plan today and enjoy an exclusive 30% discount. Contact support or visit: {portal_url}",
  },
  {
    id: "maintenance",
    label: "Maintenance Notice",
    subject: "Notice: Scheduled Server Optimization for PharmaBiz Cloud",
    message:
      "Dear {owner_name}, PharmaBiz cloud will undergo scheduled optimization tonight from 02:00 AM to 03:00 AM. Your billing data remains completely safe. - okobiz Team",
  },
];

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function SendSmsCampaignTab() {
  const [channel, setChannel] = useState<"SMS" | "EMAIL" | "BOTH">("SMS");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "DEMO" | "PENDING">("EXPIRED");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Message compose
  const [subject, setSubject] = useState("Notice from PharmaBiz Platform");
  const [message, setMessage] = useState(
    "Dear {owner_name}, your subscription for {pharmacy_name} expires on {expiry_date}. Please renew to avoid service pause. Due: ৳ {due_amount}."
  );

  // Char and SMS calculations
  const charCount = message.length;
  const isUnicode = /[^\u0000-\u007f]/.test(message);
  const smsUnit = isUnicode
    ? charCount > 70 ? Math.ceil(charCount / 67) : 1
    : charCount > 160 ? Math.ceil(charCount / 153) : 1;

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/sms/recipients?filter=${filter}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data || [];
        setRecipients(list);
        setSelectedIds(list.map((r: Recipient) => r.id));
      }
    } catch {
      Swal.fire("Error", "Failed to fetch recipient pharmacies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, [filter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecipients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecipients.map((r) => r.id));
    }
  };

  const filteredRecipients = recipients.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.pharmacy_name.toLowerCase().includes(q) ||
      r.owner_name.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q)
    );
  });

  const handleSendCampaign = async () => {
    if (selectedIds.length === 0) {
      Swal.fire("No Recipients", "Please select at least one recipient pharmacy.", "info");
      return;
    }
    if (!message.trim()) {
      Swal.fire("Empty Message", "Message body cannot be empty.", "warning");
      return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Broadcast?",
      html: `You are about to dispatch <strong>${channel}</strong> to <strong>${selectedIds.length}</strong> pharmacies.<br/>Estimated total SMS units: <strong>${selectedIds.length * smsUnit}</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Send Now",
    });

    if (confirm.isConfirmed) {
      setSending(true);
      try {
        const res = await fetch("/api/super-admin/sms/campaign", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            channel,
            subject,
            message,
            recipientIds: selectedIds,
          }),
        });
        const result = await res.json();
        if (result.success) {
          Swal.fire({
            title: "Campaign Dispatched!",
            html: `
              <div style="font-size: 13px; text-align: left; line-height: 1.8;">
                <p>✅ Sent SMS: <b>${result.totalSmsSent}</b> | ❌ Failed: <b>${result.totalSmsFailed}</b></p>
                <p>📧 Sent Emails: <b>${result.totalEmailSent}</b> | ❌ Failed: <b>${result.totalEmailFailed}</b></p>
                <p>👥 Total Recipients Targeted: <b>${result.totalRecipients}</b></p>
              </div>
            `,
            icon: "success",
            confirmButtonColor: "#0d9488",
          });
        } else {
          Swal.fire("Failed", result.message || "Failed to dispatch campaign", "error");
        }
      } catch {
        Swal.fire("Error", "Network error occurred", "error");
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Send className="w-6 h-6 text-teal-600" />
          Broadcast SMS & Email Notification
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Send announcements, expiry notices and renewal alerts to pharmacies via SMS, Email or Both.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Composer */}
        <div className="lg:col-span-7 space-y-5">
          {/* Channel Selector */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Channel:</span>
            {(["SMS", "EMAIL", "BOTH"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  channel === ch
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {ch === "SMS" && "📱 SMS Only"}
                {ch === "EMAIL" && "📧 Email Only"}
                {ch === "BOTH" && "🚀 Both (SMS + Email)"}
              </button>
            ))}
          </div>

          {/* Preset Templates */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</span>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSubject(tmpl.subject);
                    setMessage(tmpl.message);
                  }}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 text-xs rounded-lg font-medium transition cursor-pointer"
                >
                  ⚡ {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Subject (if Email or Both) */}
          {(channel === "EMAIL" || channel === "BOTH") && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          )}

          {/* Message Textarea */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Content
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded font-mono ${
                    isUnicode ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 font-bold" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {isUnicode ? "Unicode / Bangla" : "Standard ASCII"}
                </span>
                <span className="font-mono text-slate-500">
                  {charCount} chars | <strong>{smsUnit} SMS</strong>
                </span>
              </div>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {/* Variable Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold">Tags:</span>
              {["{owner_name}", "{pharmacy_name}", "{plan_name}", "{expiry_date}", "{due_amount}", "{portal_url}"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMessage((prev) => prev + " " + tag)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 text-[10px] font-mono text-slate-700 dark:text-slate-300 rounded cursor-pointer transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSendCampaign}
            disabled={sending}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending Campaign..." : `Send Broadcast to (${selectedIds.length}) Pharmacies`}
          </button>
        </div>

        {/* Right Column: Target Audience Filter & Pharmacy List */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" /> Target Pharmacies
            </h3>
            <span className="text-[11px] font-bold text-teal-600">
              Selected: {selectedIds.length} / {recipients.length}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl text-[11px] font-bold">
            {(["EXPIRED", "ACTIVE", "DEMO", "ALL"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  filter === cat
                    ? "bg-white dark:bg-slate-800 text-teal-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Select All */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pharmacy..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
            >
              {selectedIds.length === filteredRecipients.length && filteredRecipients.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>Deselect</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>All</span>
                </>
              )}
            </button>
          </div>

          {/* Pharmacy Checklist */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-teal-600" />
                Loading audience...
              </div>
            ) : filteredRecipients.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No pharmacies found in this filter.</p>
            ) : (
              filteredRecipients.map((biz) => {
                const isSelected = selectedIds.includes(biz.id);
                return (
                  <div
                    key={biz.id}
                    onClick={() => {
                      if (isSelected) setSelectedIds(selectedIds.filter((id) => id !== biz.id));
                      else setSelectedIds([...selectedIds, biz.id]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{biz.pharmacy_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {biz.owner_name} &bull; {biz.phone || "No phone"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 block">
                        {biz.expiry_date}
                      </span>
                      {biz.due_amount > 0 && (
                        <span className="text-[10px] text-amber-600 font-bold">
                          Due: ৳{biz.due_amount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
