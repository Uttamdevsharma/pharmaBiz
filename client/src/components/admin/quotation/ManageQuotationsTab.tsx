"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import Swal from "sweetalert2";

interface ManageQuotationsTabProps {
  onAddClick: () => void;
  onEditClick: (id: number) => void;
  onPrintClick: (id: number) => void;
}

export function ManageQuotationsTab({
  onAddClick,
  onEditClick,
  onPrintClick,
}: ManageQuotationsTabProps) {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nextRefNo, setNextRefNo] = useState("");
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/super-admin/quotations?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setQuotations(data.data || []);
        if (data.nextRefNo) setNextRefNo(data.nextRefNo);
      }
    } catch {
      Swal.fire("Error", "Failed to load quotations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This quotation record will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/super-admin/quotations/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        const resData = await res.json();
        if (resData.success) {
          Swal.fire("Deleted!", "Quotation removed successfully.", "success");
          setQuotations((prev) => prev.filter((q) => q.id !== id));
        } else {
          Swal.fire("Failed", resData.message || "Failed to delete quotation", "error");
        }
      } catch {
        Swal.fire("Error", "Failed to delete quotation", "error");
      }
    }
  };

  const handleSendEmail = async (quote: any) => {
    if (!quote.email) {
      Swal.fire("Missing Email", "This quotation has no client email address.", "info");
      return;
    }

    setSendingEmailId(quote.id);
    try {
      const res = await fetch(`/api/super-admin/quotations/${quote.id}/send-email`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: quote.email }),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire("Sent!", `Quotation dispatched to ${quote.email}`, "success");
        fetchQuotations();
      } else {
        Swal.fire("Failed", data.message || "Could not send email", "error");
      }
    } catch {
      Swal.fire("Error", "Network error sending email", "error");
    } finally {
      setSendingEmailId(null);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            Quotations Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, manage, print and email client quotations for PharmaBiz POS &amp; Hardware packages
          </p>
        </div>

        <button
          onClick={onAddClick}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Add Quotation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Quotations</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {quotations.length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-500">Next Reference Number</p>
            <h3 className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400 mt-1">
              {nextRefNo || "pharmabiz/001/..."}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-500">Emailed to Clients</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {quotations.filter((q) => q.email_sent_at).length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-600 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchQuotations()}
            placeholder="Search by Ref No, Client, Pharmacy name or Phone..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:bg-slate-950 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Status</option>
            <option value="SENT">Sent</option>
            <option value="DRAFT">Draft</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={fetchQuotations}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Ref No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client &amp; Pharmacy</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No quotations found. Click &quot;Add Quotation&quot; to create one.
                  </td>
                </tr>
              ) : (
                quotations.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {quote.ref_no}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {quote.quote_date
                        ? format(new Date(quote.quote_date), "dd MMM yyyy")
                        : ""}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {quote.client_name}
                      </div>
                      {quote.organization_name && (
                        <div className="text-slate-500 text-[11px]">
                          {quote.organization_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-700 dark:text-slate-300">
                      {quote.subject}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                      ৳ {Number(quote.grand_total || 0).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {quote.email_sent_at ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 dark:bg-green-950/60 dark:text-green-400 px-2 py-0.5 rounded border border-green-200 dark:border-green-800">
                          <CheckCircle className="w-3 h-3 text-green-600" /> Sent
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Not sent</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onPrintClick(quote.id)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Print / View PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(quote)}
                          disabled={sendingEmailId === quote.id}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                          title="Email Quotation"
                        >
                          {sendingEmailId === quote.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => onEditClick(quote.id)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
