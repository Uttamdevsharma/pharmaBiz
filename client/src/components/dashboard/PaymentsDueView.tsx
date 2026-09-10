"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Loader2,
  Building,
  X,
  RefreshCw,
  TrendingDown,
  Calendar,
  User,
  Phone,
  History,
  FileText,
  DollarSign,
  AlertCircle,
  Store,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranchContext } from "@/context/BranchContext";

type DateFilterPreset = "today" | "yesterday" | "this_month" | "this_year" | "custom";
type DisplayMode = "due" | "history";

interface PaymentsDueViewProps {
  onNavigate?: (module: any) => void;
  selectedBranchId?: string;
}

export function PaymentsDueView({ onNavigate: _onNavigate, selectedBranchId: propBranchId }: PaymentsDueViewProps = {}) {
  const { user } = useAuth();
  const {
    branches,
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  // Mode and Filter state
  const [displayMode, setDisplayMode] = useState<DisplayMode>("due");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [search, setSearch] = useState("");

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Summary state (dynamically updated by filters)
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalPaid: 0,
    totalDue: 0,
    dueCount: 0,
  });

  // Lists
  const [dueSuppliers, setDueSuppliers] = useState<Supplier[]>([]);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Settlement Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Compute date range ISO strings based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateFilter === "today") {
      const todayStr = formatDate(now);
      return { start: todayStr, end: todayStr };
    }
    if (dateFilter === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      return { start: yStr, end: yStr };
    }
    if (dateFilter === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    if (dateFilter === "this_year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { start: formatDate(start), end: formatDate(end) };
    }
    if (dateFilter === "custom") {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: "", end: "" };
  }, [dateFilter, customStartDate, customEndDate]);

  // Load all suppliers for the dropdown filter
  useEffect(() => {
    async function loadAllSuppliers() {
      try {
        const res = await fetchApi("/suppliers");
        if (res.success && res.data) {
          setSuppliers(res.data);
        }
      } catch (err) {
        console.error("Failed to load suppliers list", err);
      }
    }
    loadAllSuppliers();
  }, []);

  // Load financial accounts
  useEffect(() => {
    async function loadAccounts() {
      try {
        const url = (effectiveBranchId && effectiveBranchId !== "all")
          ? `/accounting/accounts?branchId=${effectiveBranchId}`
          : "/accounting/accounts";
        const res = await fetchApi<any[]>(url);
        if (res.success && res.data) {
          setFinancialAccounts(res.data);
          if (res.data.length > 0) {
            setSelectedAccountId(res.data[0].id);
          } else {
            setSelectedAccountId("");
          }
        }
      } catch (err) {
        console.error("Failed to load financial accounts", err);
      }
    }
    loadAccounts();
  }, [effectiveBranchId]);

  // Fetch summary and active table data based on active filters
  const fetchData = async (isManual = false) => {
    if (dateFilter === "custom" && (!customStartDate || !customEndDate)) return;

    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      if (selectedSupplierId) params.append("supplierId", selectedSupplierId);
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      // 1. Fetch Dynamic Summary
      const summaryRes = await fetchApi(`/suppliers/due-summary?${params.toString()}`);
      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      // 2. Fetch Due View or Payment History View
      if (displayMode === "due") {
        // Fetch suppliers with dues (and apply supplier, branch, and date filters)
        const supParams = new URLSearchParams();
        if (dateRange.start) supParams.append("startDate", dateRange.start);
        if (dateRange.end) supParams.append("endDate", dateRange.end);
        if (selectedSupplierId) supParams.append("supplierId", selectedSupplierId);
        if (effectiveBranchId && effectiveBranchId !== "all") {
          supParams.append("branchId", effectiveBranchId);
        }
        const supRes = await fetchApi(`/suppliers?${supParams.toString()}`);
        if (supRes.success && supRes.data) {
          const list = (supRes.data as Supplier[]).filter((s) => {
            if (selectedSupplierId && s.id !== selectedSupplierId) return false;
            return Number(s.totalDue || 0) > 0 || Number((s as any).periodPurchased || 0) > 0;
          });
          setDueSuppliers(list);
        }
      } else {
        // Payment History View
        const histRes = await fetchApi(`/suppliers/payments/list?${params.toString()}`);
        if (histRes.success && histRes.data) {
          setPaymentsHistory(histRes.data);
        } else {
          setPaymentsHistory([]);
        }
      }
    } catch (err) {
      console.error("Failed to load payments/due data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [displayMode, dateRange, selectedSupplierId, effectiveBranchId]);

  // Filtered due suppliers by local text search
  const filteredDueSuppliers = useMemo(() => {
    if (!search.trim()) return dueSuppliers;
    const q = search.toLowerCase();
    return dueSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q)
    );
  }, [dueSuppliers, search]);

  // Filtered payment history by local text search
  const filteredPaymentHistory = useMemo(() => {
    if (!search.trim()) return paymentsHistory;
    const q = search.toLowerCase();
    return paymentsHistory.filter(
      (p) =>
        p.supplier?.name?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.purchase?.invoiceNo?.toLowerCase().includes(q) ||
        p.financialAccount?.name?.toLowerCase().includes(q) ||
        p.financialAccount?.accountName?.toLowerCase().includes(q)
    );
  }, [paymentsHistory, search]);

  // Open Pay Modal
  const handleOpenPay = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setPayAmount(Number(sup.totalDue || 0));
    setPayNotes(`Due settlement payment for ${sup.name}`);
    setPayError(null);
    setPayModalOpen(true);
  };

  // Submit Settlement
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) return;
    if (!selectedAccountId) {
      setPayError("A valid financial account is required to record supplier payment.");
      return;
    }

    try {
      setPaying(true);
      setPayError(null);

      const res = await fetchApi<any>(`/suppliers/${selectedSupplier.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          branchId: (effectiveBranchId && effectiveBranchId !== "all")
            ? effectiveBranchId
            : (financialAccounts.find((a) => a.id === selectedAccountId)?.branchId || branches[0]?.id),
          financialAccountId: selectedAccountId,
          notes: payNotes || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to record payment");

      setSuccess(`Payment of ৳${payAmount.toFixed(2)} recorded for ${selectedSupplier.name}!`);
      setPayModalOpen(false);
      setSelectedSupplier(null);
      fetchData(true);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setPayError(err.message || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Supplier Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Payments / Due</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand-primary" />
            Supplier Payments & Outstanding Due
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track pending company dues, record settlements, and inspect complete payment history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards (Filter-Sensitive) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Purchase Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Total Purchase</span>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2">
            ৳{Number(summary.totalPurchases || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Purchases in selected period
          </div>
        </div>

        {/* Total Paid Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-950/50 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-bold uppercase tracking-wider">
            <span>Total Paid</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            ৳{Number(summary.totalPaid || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600/70 mt-1">
            Settled payments in selected period
          </div>
        </div>

        {/* Total Due Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-rose-200 dark:border-rose-950/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-rose-600 font-bold uppercase tracking-wider">
            <span>Total Due</span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">
            ৳{Number(summary.totalDue || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-rose-600/70 mt-1">
            Outstanding balance across suppliers
          </div>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* View Mode Tabs & Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Display Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDisplayMode("due")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                displayMode === "due"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Due View (Only Pending Dues)
            </button>
            <button
              onClick={() => setDisplayMode("history")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                displayMode === "history"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Payment History View
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={displayMode === "due" ? "Search due supplier..." : "Search payment history..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Filter Presets and Supplier Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date Filter:
            </span>
            {(
              [
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "this_month", label: "This Month" },
                { id: "this_year", label: "This Year" },
                { id: "custom", label: "Custom Date" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dateFilter === p.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Supplier Dropdown & Scope Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none font-bold min-w-[200px]"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
              <Store className="h-3.5 w-3.5 text-brand-primary" />
              <span>Scope:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {displayMode === "due" ? (
        /* -------------------------------------------------------------
           MODE A: DUE VIEW (Only Suppliers with Pending Dues)
        ------------------------------------------------------------- */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-600" />
              Suppliers with Pending Due
            </h3>
            <span className="text-xs text-slate-400 font-bold">
              {filteredDueSuppliers.length} supplier{filteredDueSuppliers.length === 1 ? "" : "s"} with dues
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <p className="text-xs font-bold">Loading due suppliers...</p>
            </div>
          ) : filteredDueSuppliers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No pending dues found!
              </p>
              <p className="text-xs mt-1 text-slate-400">
                All supplier accounts are fully settled or cleared for the selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Supplier / Company Name</th>
                    <th className="py-3.5 px-4">Contact Representative</th>
                    <th className="py-3.5 px-4 text-right">Total Purchased</th>
                    <th className="py-3.5 px-4 text-right">Total Paid</th>
                    <th className="py-3.5 px-4 text-right">Pending Due</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredDueSuppliers.map((s) => {
                    const total = Number(s.totalPurchased || 0);
                    const paid = Number(s.totalPaid || 0);
                    const due = Number(s.totalDue || 0);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                            {s.name}
                          </div>
                          {s.phone && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {s.phone}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            {s.contactPerson || "Direct / General"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ৳{total.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          ৳{paid.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className="text-rose-600 dark:text-rose-400 font-black text-sm bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50">
                            ৳{due.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenPay(s)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 ml-auto active:scale-95"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Settle Due
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* -------------------------------------------------------------
           MODE B: PAYMENT HISTORY VIEW
           Columns: Date, Supplier, Purchase Ref, Paid, Due, Account/Method
        ------------------------------------------------------------- */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-brand-primary" />
              Supplier Payment History
            </h3>
            <span className="text-xs text-slate-400 font-bold">
              {filteredPaymentHistory.length} transaction{filteredPaymentHistory.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <p className="text-xs font-bold">Loading payment history...</p>
            </div>
          ) : filteredPaymentHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No payment transactions recorded for selected filter
              </p>
              <p className="text-xs mt-1 text-slate-400">
                Payments made via due settlements or stock intake will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4">Purchase Ref</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Due (After)</th>
                    <th className="py-3.5 px-4">Account / Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredPaymentHistory.map((p) => {
                    const paid = Number(p.amount || 0);
                    const due = Number(p.remainingDue !== undefined && p.remainingDue !== null ? p.remainingDue : p.dueRemaining || 0);
                    const purchaseRef = p.reference || p.purchase?.invoiceNo || (p.purchaseId ? `PUR-${p.purchaseId.slice(-6)}` : "General Settlement");
                    const accountName = p.financialAccount?.name || p.financialAccount?.accountName || p.paymentMethod || "Cash";
                    const accountType = p.financialAccount?.type ? ` (${p.financialAccount.type})` : "";
                    const method = `${accountName}${accountType}`;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        {/* Date */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(p.paymentDate || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                            {p.supplier?.name || "Supplier"}
                          </div>
                        </td>

                        {/* Purchase Ref */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                            {purchaseRef}
                          </span>
                          {p.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                              {p.notes}
                            </div>
                          )}
                        </td>

                        {/* Paid */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{paid.toFixed(2)}
                        </td>

                        {/* Due */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          {due > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              ৳{due.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Cleared</span>
                          )}
                        </td>

                        {/* Account / Method */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                            {method}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settle Due Modal */}
      {payModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Settle Supplier Due</h3>
                  <p className="text-xs text-slate-400">{selectedSupplier.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">Outstanding Due:</span>
                <span className="font-black font-mono text-base text-rose-600">
                  ৳{Number(selectedSupplier.totalDue || 0).toFixed(2)}
                </span>
              </div>

              {/* Settlement Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={Number(selectedSupplier.totalDue || 0)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono outline-none dark:text-white focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Financial Account */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paid From Account *
                </label>
                <select
                  required
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
                >
                  <option value="">Select Account (Cash / Bank / MFS)</option>
                  {financialAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.accountType}) — ৳{Number(acc.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check #4092, bKash TrxID, Cash voucher"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
