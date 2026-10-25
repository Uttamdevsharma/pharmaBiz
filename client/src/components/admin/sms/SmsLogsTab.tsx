"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";

interface SmsLogItem {
  id: number;
  recipient_name: string;
  recipient_number: string;
  channel: string;
  message: string;
  sms_count: number;
  status: "SENT" | "FAILED" | "DELIVERED";
  response_data?: string;
  created_at: string;
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function SmsLogsTab() {
  const [logs, setLogs] = useState<SmsLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL, TODAY, 7DAYS, 30DAYS
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        status: statusFilter,
        dateRange: dateFilter,
        search,
      });
      const res = await fetch(`/api/super-admin/sms/logs?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setPagination(data.pagination || { totalPages: 1, total: 0 });
      }
    } catch {
      Swal.fire("Error", "Failed to load SMS logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter, dateFilter]);

  const viewResponseData = (log: SmsLogItem) => {
    const formattedDate = log.created_at ? format(new Date(log.created_at), "dd MMM yyyy, hh:mm a") : "N/A";
    let formattedJson = log.response_data || "No gateway response recorded";
    try {
      const parsed = JSON.parse(formattedJson);
      formattedJson = JSON.stringify(parsed, null, 2);
    } catch {
      // not JSON or raw text
    }

    Swal.fire({
      title: "Gateway Response Payload",
      html: `
        <div style="text-align: left; font-size: 11px;">
          <p><strong>Channel:</strong> <span class="badge">${log.channel || "SMS"}</span></p>
          <p><strong>Recipient:</strong> ${log.recipient_number} (${log.recipient_name || "N/A"})</p>
          <p><strong>Dispatched At:</strong> ${formattedDate}</p>
          <hr style="margin: 8px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <pre style="background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 8px; overflow-x: auto; max-height: 250px; font-family: monospace; font-size: 11px; white-space: pre-wrap;">${formattedJson}</pre>
        </div>
      `,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Close",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            SMS Delivery & Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time delivery status, character counts and provider responses of all SMS & Email dispatches.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer transition"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {["ALL", "SENT", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                statusFilter === st
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {st === "ALL" && "All Status"}
              {st === "SENT" && "✅ Sent"}
              {st === "FAILED" && "❌ Failed"}
            </button>
          ))}
        </div>

        {/* Date Filter & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              placeholder="Search phone or text..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4 text-center">Units</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Gateway Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading SMS delivery logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No SMS logs found for this filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {log.created_at ? format(new Date(log.created_at), "dd MMM yyyy, hh:mm a") : "N/A"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.channel === "EMAIL" ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"}`}>
                        {log.channel || "SMS"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {log.recipient_number}
                      </div>
                      {log.recipient_name && (
                        <div className="text-[11px] text-slate-500">{log.recipient_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <div className="truncate text-slate-800 dark:text-slate-200" title={log.message}>
                        {log.message}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                      {log.sms_count}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {log.status === "SENT" || log.status === "DELIVERED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded border border-green-200 dark:border-green-800/50">
                          <CheckCircle2 className="w-3 h-3 text-green-600" /> Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded border border-red-200 dark:border-red-800/50">
                          <XCircle className="w-3 h-3 text-red-600" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => viewResponseData(log)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Total {pagination.total} records &bull; Page {page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
