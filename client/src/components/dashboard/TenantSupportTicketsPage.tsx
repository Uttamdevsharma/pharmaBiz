"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  RefreshCw,
  Plus,
  Search,
  MessageSquare,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Bug,
  Sparkles,
  HelpCircle,
  X,
  Paperclip,
  Loader2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { TicketChatDrawer } from "@/components/chat/TicketChatDrawer";

interface TenantTicket {
  id: number;
  ticket_no: string;
  business_id: string;
  user_id: string;
  branch_id?: string | null;
  subject: string;
  message: string;
  category: "BUG" | "FEATURE" | "QUERY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "CHECKING" | "WORKING" | "TESTING" | "SOLVED" | "CLOSED";
  attachments?: any;
  created_at: string;
  updated_at: string;
  unread_count: number;
  reply_count: number;
}

interface TenantMetrics {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export function TenantSupportTicketsPage() {
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [metrics, setMetrics] = useState<TenantMetrics>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Chat Drawer & Create Modal
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Ticket Form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<"BUG" | "FEATURE" | "QUERY">("QUERY");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [message, setMessage] = useState("");
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);

      const res = await fetchApi<{ tickets: TenantTicket[]; metrics: TenantMetrics }>(
        `/tenant/support-tickets?${params.toString()}`,
        { skipCache: true, skipProgress: true }
      );

      if (res.success && res.data) {
        setTickets(res.data.tickets || []);
        setMetrics(
          res.data.metrics || {
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0,
          }
        );
      }
    } catch (e) {
      console.error("Failed to load tenant tickets:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(true);
  }, [statusFilter, categoryFilter, priorityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Periodic polling every 5 seconds for new admin replies
  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [statusFilter, categoryFilter, priorityFilter, search]);

  const handleOpenConversation = (ticketId: number) => {
    setActiveTicketId(ticketId);
    setDrawerOpen(true);
    // Mark as locally read
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, unread_count: 0 } : t))
    );
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setSubmitting(true);
      const attachments = attachmentBase64 ? [{ type: "image", url: attachmentBase64 }] : null;

      const res = await fetchApi<{ ticket: TenantTicket }>("/tenant/support-tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category,
          priority,
          attachments,
        }),
      });

      if (res.success) {
        showAlert.toast("Support ticket submitted successfully!", "success");
        setCreateModalOpen(false);
        setSubject("");
        setMessage("");
        setAttachmentBase64(null);
        setCategory("QUERY");
        setPriority("MEDIUM");
        loadTickets(true);
      }
    } catch (e) {
      showAlert.error("Failed to create support ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAttachmentBase64(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "BUG":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <Bug className="h-3 w-3" />
            Bug
          </span>
        );
      case "FEATURE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Sparkles className="h-3 w-3" />
            Feature
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <HelpCircle className="h-3 w-3" />
            Query
          </span>
        );
    }
  };

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "URGENT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Urgent
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            High
          </span>
        );
      case "LOW":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (s?: string) => {
    switch (s) {
      case "WORKING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Wrench className="h-3 w-3" />
            Working
          </span>
        );
      case "CHECKING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            Checking
          </span>
        );
      case "SOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Solved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Helpdesk & Support Tickets
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Direct support and assistance from our PharmaBiz technical engineering team.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadTickets(true)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Ticket</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL TICKETS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              TOTAL TICKETS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {metrics.total}
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <LifeBuoy className="h-5 w-5" />
          </div>
        </div>

        {/* PENDING REVIEW */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black tracking-wider text-amber-600 dark:text-amber-500 uppercase">
              PENDING REVIEW
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
              {metrics.pending}
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* IN PROGRESS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black tracking-wider text-purple-600 dark:text-purple-400 uppercase">
              IN PROGRESS
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {metrics.inProgress}
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        {/* RESOLVED / CLOSED */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              RESOLVED / CLOSED
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.resolved}
            </div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, subject or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CHECKING">Checking</option>
            <option value="WORKING">Working</option>
            <option value="TESTING">Testing</option>
            <option value="SOLVED">Solved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="QUERY">Query</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ticket No</th>
                <th className="py-3.5 px-4 min-w-[220px]">Subject</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <LifeBuoy className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">No support tickets found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Need help? Click "+ Create New Ticket" to report an issue or question.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const hasUnread = t.unread_count > 0;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Ticket No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenConversation(t.id)}
                          className="hover:underline cursor-pointer"
                        >
                          {t.ticket_no}
                        </button>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {t.message}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getCategoryBadge(t.category)}</td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getPriorityBadge(t.priority)}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTime(t.updated_at)}
                      </td>

                      {/* Action Button with Pulsing Unread Badge */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="relative inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => handleOpenConversation(t.id)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                            <span>Chat</span>
                          </button>

                          {/* Glowing Animated Red Unread Badge (1, 2 etc.) */}
                          {hasUnread && (
                            <span className="absolute -top-2 -right-2 flex h-5 min-w-5 z-10 pointer-events-none">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                              <span className="relative inline-flex items-center justify-center rounded-full h-5 min-w-5 px-1 text-[10px] font-black bg-rose-500 text-white shadow-md border-2 border-white dark:border-slate-900 animate-pulse">
                                {t.unread_count}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Chat Drawer Modal */}
      <TicketChatDrawer
        ticketId={activeTicketId}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveTicketId(null);
          loadTickets(false);
        }}
        viewerMode="TENANT"
        onStatusUpdated={() => loadTickets(false)}
      />

      {/* Create New Ticket Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-teal-600" />
                <span>Submit New Support Ticket</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-rose-500 mr-1">*</span>Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Error Arise From Account section or Scanner issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="QUERY">Technical Query</option>
                    <option value="BUG">Bug / System Error</option>
                    <option value="FEATURE">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-rose-500 mr-1">*</span>Problem Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe the issue in detail, what steps led to it, or what you need assistance with..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>

              {/* Screenshot Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attach Screenshot (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {attachmentBase64 && (
                    <div className="relative">
                      <img
                        src={attachmentBase64}
                        alt="Preview"
                        className="h-10 w-16 object-cover rounded-lg border border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setAttachmentBase64(null)}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
