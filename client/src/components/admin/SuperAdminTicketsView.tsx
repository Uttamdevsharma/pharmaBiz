"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  RefreshCw,
  Search,
  MessageSquare,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Bug,
  Sparkles,
  HelpCircle,
  Building2,
  User,
  Loader2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { TicketChatDrawer } from "@/components/chat/TicketChatDrawer";

interface AdminTicket {
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
  tenant?: { id: string; name: string; phone?: string; email?: string } | null;
  creator?: { id: string; name?: string; email?: string; phone?: string } | null;
}

interface AdminTicketMetrics {
  all: number;
  pending: number;
  checking: number;
  working: number;
  solved: number;
}

export function SuperAdminTicketsView() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [metrics, setMetrics] = useState<AdminTicketMetrics>({
    all: 0,
    pending: 0,
    checking: 0,
    working: 0,
    solved: 0,
  });
  const [pharmacies, setPharmacies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Chat Drawer
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load pharmacy tenants for dropdown
  useEffect(() => {
    fetchApi<{ tenants: any[] }>("/super-admin/tenants?limit=100", {
      skipCache: true,
      skipProgress: true,
    })
      .then((res) => {
        if (res.success && res.data?.tenants) {
          setPharmacies(res.data.tenants);
        }
      })
      .catch(() => {});
  }, []);

  const loadTickets = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedPharmacy !== "ALL") params.append("business_id", selectedPharmacy);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);

      const res = await fetchApi<{
        tickets: AdminTicket[];
        metrics: AdminTicketMetrics;
      }>(`/super-admin/support-tickets?${params.toString()}`, {
        skipCache: true,
        skipProgress: true,
      });

      if (res.success && res.data) {
        setTickets(res.data.tickets || []);
        setMetrics(
          res.data.metrics || {
            all: 0,
            pending: 0,
            checking: 0,
            working: 0,
            solved: 0,
          }
        );
      }
    } catch (e) {
      console.error("Failed to load admin tickets:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(true);
  }, [selectedPharmacy, statusFilter, categoryFilter, priorityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Periodic polling every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedPharmacy, statusFilter, categoryFilter, priorityFilter, search]);

  // Direct Status Update from table row
  const handleQuickStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      const res = await fetchApi(`/super-admin/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
        skipProgress: true,
      });

      if (res.success) {
        showAlert.toast(`Ticket status updated to ${newStatus}`, "success");
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus as any } : t))
        );
        loadTickets(false);
      }
    } catch (e) {
      showAlert.error("Failed to update status");
    }
  };

  const handleOpenConversation = (ticketId: number) => {
    setActiveTicketId(ticketId);
    setDrawerOpen(true);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, unread_count: 0 } : t))
    );
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 shrink-0">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Central Support Helpdesk
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200/60 dark:border-teal-800">
                Platform Multi-Tenant
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Real-time support ticket tracking and customer engineering requests across all pharmacies.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadTickets(true)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* 5 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* ALL TICKETS */}
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "ALL"
              ? "border-2 border-teal-500 ring-2 ring-teal-500/20 shadow-teal-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            ALL TICKETS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.all}
          </div>
        </button>

        {/* PENDING */}
        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "PENDING"
              ? "border-2 border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-amber-600 dark:text-amber-500 uppercase">
            PENDING
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
            {metrics.pending}
          </div>
        </button>

        {/* CHECKING */}
        <button
          type="button"
          onClick={() => setStatusFilter("CHECKING")}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "CHECKING"
              ? "border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-blue-600 dark:text-blue-400 uppercase">
            CHECKING
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {metrics.checking}
          </div>
        </button>

        {/* WORKING */}
        <button
          type="button"
          onClick={() => setStatusFilter("WORKING")}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "WORKING"
              ? "border-2 border-purple-500 ring-2 ring-purple-500/20 shadow-purple-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-purple-600 dark:text-purple-400 uppercase">
            WORKING
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {metrics.working}
          </div>
        </button>

        {/* SOLVED */}
        <button
          type="button"
          onClick={() => setStatusFilter("SOLVED")}
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 text-left transition-all cursor-pointer shadow-sm ${
            statusFilter === "SOLVED"
              ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10"
              : "border border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            SOLVED
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.solved}
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, pharmacy name, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pharmacy Dropdown */}
          <select
            value={selectedPharmacy}
            onChange={(e) => setSelectedPharmacy(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 max-w-[180px] truncate"
          >
            <option value="ALL">All Pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status */}
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

          {/* Category */}
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

          {/* Priority */}
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
                <th className="py-3.5 px-4">Pharmacy / Store</th>
                <th className="py-3.5 px-4">Requester</th>
                <th className="py-3.5 px-4 min-w-[200px]">Subject</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <LifeBuoy className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">No support tickets found</p>
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

                      {/* Pharmacy / Business */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {t.tenant?.name || "Pharmacy"}
                        </div>
                        {t.tenant?.phone && (
                          <div className="text-[11px] text-slate-400 truncate">{t.tenant.phone}</div>
                        )}
                      </td>

                      {/* Requester User */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                          {t.creator?.name || "Staff"}
                        </div>
                        {t.creator?.email && (
                          <div className="text-[10px] text-slate-400 truncate">{t.creator.email}</div>
                        )}
                      </td>

                      {/* Subject + Snippet */}
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

                      {/* Direct Inline Status Switcher Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={t.status}
                          onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                          className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-2xs"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CHECKING">Checking</option>
                          <option value="WORKING">Working</option>
                          <option value="TESTING">Testing</option>
                          <option value="SOLVED">Solved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTime(t.updated_at)}
                      </td>

                      {/* Actions: Reply button with Glowing Red Unread Badge */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="relative inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => handleOpenConversation(t.id)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                            <span>Reply ({t.reply_count || 0})</span>
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
        viewerMode="SUPER_ADMIN"
        onStatusUpdated={() => loadTickets(false)}
      />
    </div>
  );
}
