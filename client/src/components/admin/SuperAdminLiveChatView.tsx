"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  MoreVertical,
  Info,
  CheckCircle2,
  Check,
  ChevronDown,
  Sparkles,
  Phone,
  Mail,
  Globe,
  Loader2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/lib/swal";

interface LiveChatMessage {
  id: number;
  session_id: number;
  sender_type: "VISITOR" | "AGENT" | "SYSTEM";
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface LiveChatSession {
  id: number;
  session_token: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  department: string;
  status: "WAITING" | "ACTIVE" | "RESOLVED" | "CLOSED";
  current_url?: string | null;
  user_agent?: string | null;
  last_message_at: string;
  created_at: string;
  unread_count: number;
  last_message?: LiveChatMessage | null;
}

interface Metrics {
  totalChats: number;
  waitingChats: number;
  unreadTotal: number;
}

const CANNED_RESPONSES = [
  "Hello! Welcome to PharmaBiz. How can I assist your pharmacy today?",
  "Are you interested in our multi-branch inventory or medicine expiry tracking features?",
  "Let me check that for you right now.",
  "Could you please tell me your pharmacy name and contact number?",
  "Let me connect you with a technical specialist for barcode scanner/printer setup.",
  "We provide 24/7 priority onboarding support for all pharmacies. Would you like a demo?",
];

const DEPARTMENTS = [
  { id: "ALL", label: "All Depts" },
  { id: "SALES", label: "SALES" },
  { id: "TECH_SUPPORT", label: "TECH SUPPORT" },
  { id: "BILLING", label: "BILLING" },
  { id: "GENERAL", label: "GENERAL" },
];

export function SuperAdminLiveChatView() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<LiveChatSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalChats: 0,
    waitingChats: 0,
    unreadTotal: 0,
  });

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // References for pure inner-container scrolling without touching the parent page/window
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<number>(0);
  const selectedIdRef = useRef<number | null>(null);

  const scrollToBottom = (smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // Only scroll when session changes or a genuinely new message arrives
  useEffect(() => {
    if (messages.length === 0) return;

    const currentLastMsg = messages[messages.length - 1];
    const isNewSession = selectedIdRef.current !== selectedSessionId;
    const isNewMessage = currentLastMsg && currentLastMsg.id !== lastMsgIdRef.current;

    if (isNewSession) {
      selectedIdRef.current = selectedSessionId;
      if (currentLastMsg) lastMsgIdRef.current = currentLastMsg.id;
      setTimeout(() => scrollToBottom(false), 50);
    } else if (isNewMessage) {
      lastMsgIdRef.current = currentLastMsg.id;
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [messages, selectedSessionId]);

  // Load all sessions
  const loadSessions = async (showLoadingState = false) => {
    if (showLoadingState) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedDept !== "ALL") params.append("department", selectedDept);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetchApi<{ sessions: LiveChatSession[]; metrics: Metrics }>(
        `/super-admin/live-chat/sessions?${params.toString()}`,
        { skipCache: true, skipProgress: true }
      );

      if (res.success && res.data) {
        setSessions(res.data.sessions || []);
        setMetrics(
          res.data.metrics || {
            totalChats: 0,
            waitingChats: 0,
            unreadTotal: 0,
          }
        );

        // Auto select first session if none is selected
        if (selectedSessionId === null && res.data.sessions.length > 0) {
          setSelectedSessionId(res.data.sessions[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  // Initial load & when filters change
  useEffect(() => {
    loadSessions(true);
  }, [selectedDept, statusFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSessions(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Background Polling every 3.5s (completely silent: NO top loader, NO page jumps)
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions(false);
      if (selectedSessionId) {
        loadSessionMessages(selectedSessionId, false);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedSessionId, selectedDept, statusFilter, search]);

  // Load messages for a single session
  const loadSessionMessages = async (id: number, showLoading = false) => {
    if (showLoading) setMessagesLoading(true);
    try {
      const res = await fetchApi<{
        session: LiveChatSession;
        messages: LiveChatMessage[];
      }>(`/super-admin/live-chat/sessions/${id}`, {
        skipCache: true,
        skipProgress: true,
      });

      if (res.success && res.data) {
        setActiveSession(res.data.session);

        // Only update messages state if array contents actually changed to avoid re-renders
        const newMsgs = res.data.messages || [];
        setMessages((prev) => {
          if (
            prev.length === newMsgs.length &&
            prev[prev.length - 1]?.id === newMsgs[newMsgs.length - 1]?.id
          ) {
            return prev;
          }
          return newMsgs;
        });

        // Decrement local unread count for the active session
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, unread_count: 0 } : s))
        );
      }
    } catch (e) {
      console.error("Failed to load session details:", e);
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionMessages(selectedSessionId, true);
    } else {
      setActiveSession(null);
      setMessages([]);
    }
  }, [selectedSessionId]);

  // Send Admin Reply
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedSessionId) return;

    const text = replyText.trim();
    setReplyText("");
    setSending(true);

    try {
      const res = await fetchApi<{ message: LiveChatMessage }>(
        `/super-admin/live-chat/sessions/${selectedSessionId}`,
        {
          method: "POST",
          body: JSON.stringify({ message: text }),
          skipProgress: true,
        }
      );

      if (res.success && res.data?.message) {
        setMessages((prev) => [...prev, res.data!.message]);
        if (activeSession) {
          setActiveSession({ ...activeSession, status: "ACTIVE" });
        }
        setSessions((prev) =>
          prev.map((s) =>
            s.id === selectedSessionId
              ? {
                  ...s,
                  status: "ACTIVE",
                  last_message_at: new Date().toISOString(),
                  last_message: res.data!.message,
                  unread_count: 0,
                }
              : s
          )
        );
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (e) {
      showAlert.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  // Change Session Status
  const handleUpdateStatus = async (newStatus: "WAITING" | "ACTIVE" | "RESOLVED" | "CLOSED") => {
    if (!selectedSessionId) return;
    setStatusMenuOpen(false);

    try {
      const res = await fetchApi<{ session: LiveChatSession }>(
        `/super-admin/live-chat/sessions/${selectedSessionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
          skipProgress: true,
        }
      );

      if (res.success && res.data?.session) {
        setActiveSession((prev) => (prev ? { ...prev, status: newStatus } : null));
        setSessions((prev) =>
          prev.map((s) => (s.id === selectedSessionId ? { ...s, status: newStatus } : s))
        );
        showAlert.toast(`Status updated to ${newStatus}`, "success");
        loadSessionMessages(selectedSessionId, false);
      }
    } catch (e) {
      showAlert.error("Failed to update status");
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const getDeptBadgeStyle = (dept: string) => {
    switch (dept) {
      case "TECH_SUPPORT":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
      case "SALES":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
      case "BILLING":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Status: ACTIVE
          </span>
        );
      case "RESOLVED":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Status: RESOLVED
          </span>
        );
      case "CLOSED":
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Status: CLOSED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Status: WAITING
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Live Chat Support Console
              </h1>
              {metrics.unreadTotal > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black shadow-sm animate-pulse">
                  {metrics.unreadTotal} Unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Real-time live messaging and customer inquiries across PharmaBiz.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadSessions(true)}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Exactly 2 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: ALL CHATS */}
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "ALL"
              ? "border-2 border-teal-500 ring-2 ring-teal-500/20 shadow-teal-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            ALL CHATS
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.totalChats}
          </div>
        </button>

        {/* Card 2: WAITING RESPONSE */}
        <button
          type="button"
          onClick={() => setStatusFilter("WAITING")}
          className={`p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "WAITING"
              ? "border-2 border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-amber-600 dark:text-amber-500 uppercase">
            WAITING RESPONSE
          </div>
          <div className="text-3xl font-black text-amber-500 mt-1">
            {metrics.waitingChats}
          </div>
        </button>
      </div>

      {/* Main 2-Column Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[620px] max-h-[750px]">
        {/* ================= LEFT COLUMN: THREADS QUEUE (5 COLS) ================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full">
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search visitor, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>
          </div>

          {/* Department Filter Tabs */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto sidebar-scrollbar shrink-0">
            {DEPARTMENTS.map((dept) => {
              const active = selectedDept === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDept(dept.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-teal-700 text-white shadow-md shadow-teal-700/20"
                      : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>

          {/* Sessions Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 sidebar-scrollbar">
            {loading && sessions.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No chat inquiries found
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Incoming questions from the visitor widget will appear here.
                </p>
              </div>
            ) : (
              sessions.map((s) => {
                const isSelected = selectedSessionId === s.id;
                const hasUnread = s.unread_count > 0;
                const initial = (s.visitor_name || "V").charAt(0).toUpperCase();

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3.5 transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-teal-50/70 dark:bg-teal-950/30 border-l-4 border-teal-600"
                        : hasUnread
                        ? "bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-rose-500 hover:bg-rose-50/70 dark:hover:bg-rose-950/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with Status Dot */}
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className={`h-10 w-10 rounded-full font-black text-sm flex items-center justify-center shadow-sm text-white ${
                            hasUnread
                              ? "bg-rose-600 shadow-rose-600/30"
                              : "bg-teal-600"
                          }`}
                        >
                          {initial}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                            hasUnread
                              ? "bg-rose-500 animate-ping"
                              : s.status === "ACTIVE"
                              ? "bg-emerald-500"
                              : s.status === "RESOLVED"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name + Unread Count Badge + Timestamp */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-sm truncate ${
                                hasUnread
                                  ? "font-black text-slate-950 dark:text-white"
                                  : "font-bold text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {s.visitor_name}
                            </span>

                            {/* Prominent Red Unread Badge beside the name */}
                            {hasUnread && (
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] h-5 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-sm shrink-0 animate-pulse">
                                {s.unread_count}
                              </span>
                            )}

                            {!hasUnread && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md shrink-0">
                                <Check className="h-3 w-3" />
                                <span>Read</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatTime(s.last_message_at)}
                          </span>
                        </div>

                        {/* Department Badge + Phone */}
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${getDeptBadgeStyle(
                              s.department
                            )}`}
                          >
                            {s.department.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {s.visitor_phone}
                          </span>
                        </div>

                        {/* Last Message Snippet + NEW indicator */}
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              hasUnread
                                ? "font-bold text-slate-900 dark:text-slate-100"
                                : "font-normal text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {s.last_message ? s.last_message.message : "Inquiry submitted"}
                          </p>

                          {hasUnread && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ACTIVE CHAT WORKSPACE (7 COLS) ================= */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full">
          {activeSession ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-teal-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {(activeSession.visitor_name || "V").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {activeSession.visitor_name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setInfoModalOpen(!infoModalOpen)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        title="View Visitor Metadata"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {activeSession.visitor_email} • {activeSession.visitor_phone}
                    </p>
                  </div>
                </div>

                {/* Status Switcher & Actions */}
                <div className="flex items-center gap-2 relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    {getStatusBadge(activeSession.status)}
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
                  </button>

                  {/* Dropdown Menu */}
                  {statusMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus("ACTIVE")}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Mark as ACTIVE
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus("WAITING")}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2"
                      >
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Mark as WAITING
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus("RESOLVED")}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        Mark as RESOLVED
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus("CLOSED")}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                      >
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        Close Chat Session
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Visitor Metadata Popover */}
              {infoModalOpen && (
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 border-b border-teal-200/60 dark:border-teal-900/40 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-4 animate-in fade-in duration-150 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-teal-600" />
                    <span>Origin URL: {activeSession.current_url || "Landing Page"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-teal-600" />
                    <span>Email: {activeSession.visitor_email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                    <span>Phone: {activeSession.visitor_phone}</span>
                  </div>
                </div>
              )}

              {/* Chat Message Bubbles Stream (Strict isolated scrolling - never scrolls parent page) */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 sidebar-scrollbar bg-slate-50/40 dark:bg-slate-950/30"
              >
                {messagesLoading && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                  </div>
                ) : (
                  messages.map((m) => {
                    // System notice message
                    if (m.sender_type === "SYSTEM") {
                      return (
                        <div key={m.id} className="flex justify-center my-3">
                          <div className="px-4 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs text-center max-w-[85%] leading-relaxed shadow-xs">
                            {m.message}
                          </div>
                        </div>
                      );
                    }

                    // Agent message (Super Admin on right)
                    if (m.sender_type === "AGENT") {
                      return (
                        <div key={m.id} className="flex flex-col items-end">
                          <span className="text-[11px] text-slate-400 font-medium mb-1 mr-1">
                            {m.sender_name || "Super Admin"}
                          </span>
                          <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-teal-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed shadow-sm break-words">
                            {m.message}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 mr-1">
                            {formatTime(m.created_at)}
                          </span>
                        </div>
                      );
                    }

                    // Visitor message (on left)
                    return (
                      <div key={m.id} className="flex flex-col items-start">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1 ml-1">
                          {activeSession.visitor_name}
                        </span>
                        <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/70 px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm break-words">
                          {m.message}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 ml-1">
                          {formatTime(m.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Canned Responses Bar */}
              <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto sidebar-scrollbar shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Quick:
                </span>
                {CANNED_RESPONSES.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(chip)}
                    className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Reply Input Box */}
              <form
                onSubmit={handleSendReply}
                className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Select a conversation
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a customer thread from the left queue to view messages and reply in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
