"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Building2,
  Zap,
  Wifi,
  ShieldCheck,
  Wrench,
  Layers,
  Users,
  DollarSign,
  Calendar,
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Search,
  Sliders,
  Receipt,
  Info,
  Clock,
  Check,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface ExpensesRecurringViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectForPayment?: (config: RecurringConfig) => void;
}

export interface RecurringConfig {
  id: string;
  branchId: string;
  category: "SHOP_RENT" | "ELECTRICITY_BILL" | "INTERNET_BILL" | "SECURITY_GUARD" | "MAINTENANCE" | "EMPLOYEE_SALARY" | "OTHER";
  title: string;
  estimatedAmount: number;
  dueDay?: number | null;
  notes?: string | null;
  isActive: boolean;
  branch?: { id: string; name: string };
  createdAt?: string;
}

export const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string; desc: string }
> = {
  SHOP_RENT: {
    label: "Shop Rent",
    icon: Building2,
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    desc: "Monthly showroom & premises rental",
  },
  ELECTRICITY_BILL: {
    label: "Electricity Bill",
    icon: Zap,
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    desc: "DESCO / DPDC / REB monthly power supply",
  },
  INTERNET_BILL: {
    label: "Internet Bill",
    icon: Wifi,
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20",
    desc: "Broadband, fiber & Wi-Fi connectivity",
  },
  SECURITY_GUARD: {
    label: "Guard Salary",
    icon: ShieldCheck,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    desc: "Security guards & night watchmen service",
  },
  MAINTENANCE: {
    label: "Maintenance",
    icon: Wrench,
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20",
    desc: "AC servicing, plumbing, and store upkeep",
  },
  EMPLOYEE_SALARY: {
    label: "Employee Salary",
    icon: Users,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    desc: "Branch employee monthly payroll",
  },
  OTHER: {
    label: "Other Expenses",
    icon: Layers,
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    desc: "Miscellaneous recurring branch operational expenses",
  },
};

const SUGGESTED_BILLS = [
  { category: "SHOP_RENT" as const, title: "Main Showroom Rent", defaultAmount: 45000, dueDay: 5 },
  { category: "ELECTRICITY_BILL" as const, title: "Monthly Electricity (DESCO)", defaultAmount: 8500, dueDay: 10 },
  { category: "INTERNET_BILL" as const, title: "High-Speed Fiber Internet", defaultAmount: 2000, dueDay: 7 },
  { category: "SECURITY_GUARD" as const, title: "Security Guard Salary", defaultAmount: 12000, dueDay: 1 },
  { category: "MAINTENANCE" as const, title: "AC & Store Maintenance", defaultAmount: 3000, dueDay: 15 },
];

export function ExpensesRecurringView({
  selectedBranchId,
  onNavigate,
  onSelectForPayment,
}: ExpensesRecurringViewProps) {
  const [bills, setBills] = useState<RecurringConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "SHOP_RENT" as RecurringConfig["category"],
    title: "",
    estimatedAmount: "" as number | "",
    dueDay: "" as number | "",
    notes: "",
  });

  const loadRecurringBills = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<RecurringConfig[]>(
        `/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=false`
      );
      if (res.success && res.data) {
        setBills(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load recurring bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecurringBills();
  }, [selectedBranchId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError("Please select a branch first");
      return;
    }
    if (!formData.title.trim()) {
      setError("Bill title is required");
      return;
    }
    if (!formData.estimatedAmount || Number(formData.estimatedAmount) <= 0) {
      setError("Please enter a valid estimated monthly amount");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<RecurringConfig>("/accounting/recurring-expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          category: formData.category,
          title: formData.title.trim(),
          estimatedAmount: Number(formData.estimatedAmount),
          dueDay: formData.dueDay ? Number(formData.dueDay) : null,
          notes: formData.notes.trim() || null,
        }),
      });

      if (res.success) {
        setSuccessMsg(`"${formData.title}" added to recurring bills successfully!`);
        setIsModalOpen(false);
        setFormData({
          category: "SHOP_RENT",
          title: "",
          estimatedAmount: "",
          dueDay: "",
          notes: "",
        });
        loadRecurringBills();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || "Failed to create recurring bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create recurring bill");
    } finally {
      setSubmitting(false);
    }
  };

  const selectSuggestion = (sug: (typeof SUGGESTED_BILLS)[0]) => {
    setFormData({
      category: sug.category,
      title: sug.title,
      estimatedAmount: sug.defaultAmount,
      dueDay: sug.dueDay,
      notes: "",
    });
  };

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === "ALL" || b.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalEstimated = bills.reduce((sum, b) => sum + Number(b.estimatedAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recurring Bills</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage branch monthly recurring expenses (Shop Rent, Electricity, Internet, Guard Salary, Maintenance, etc.)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.("exp_settings")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <Sliders className="w-4 h-4" />
            Bill Settings
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Recurring Bill
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Branch Specific & Historical Integrity Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Branch-Isolated & Immutable Ledger:</span> All recurring bills are strictly scoped to the active branch. Setting or editing recurring bills acts as a monthly template and will <span className="font-bold underline">never alter previous payment records</span>.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Recurring Bills
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{bills.length}</span>
            <span className="text-xs text-slate-500">bills configured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Est. Monthly Total
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              ৳{totalEstimated.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">/ month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Payment Action
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <button
              onClick={() => onNavigate?.("exp_monthly")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
            >
              Go to Monthly Expenses
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bills by name or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              categoryFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_META).map(([catKey, meta]) => (
            <button
              key={catKey}
              onClick={() => setCategoryFilter(catKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                categoryFilter === catKey
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <meta.icon className="w-3.5 h-3.5" />
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recurring Bills Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="mt-3 text-sm text-slate-500">Loading recurring bills...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl mb-4">
            <CalendarDays className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No recurring bills found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            {searchQuery || categoryFilter !== "ALL"
              ? "No recurring bills match your filter criteria."
              : "Create custom recurring expenses for this branch such as Shop Rent, Electricity, Internet, Guard Salary, Maintenance, etc."}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Create First Recurring Bill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBills.map((bill) => {
            const meta = CATEGORY_META[bill.category] || CATEGORY_META.OTHER;
            const Icon = meta.icon;

            return (
              <div
                key={bill.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${meta.bg} ${meta.text}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${meta.bg} ${meta.text} mb-1`}>
                          {meta.label}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                          {bill.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Estimated Amount:</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        ৳{Number(bill.estimatedAmount).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Due Day:</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {bill.dueDay ? `${bill.dueDay}th of each month` : "Anytime in month"}
                      </span>
                    </div>

                    {bill.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg mt-2 italic">
                        &ldquo;{bill.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onSelectForPayment) {
                        onSelectForPayment(bill);
                      } else {
                        onNavigate?.("exp_monthly");
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Record Payment
                  </button>
                  <button
                    onClick={() => onNavigate?.("exp_settings")}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                    title="Edit in Bill Settings"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Recurring Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Recurring Bill</h3>
                  <p className="text-xs text-slate-500">Configure a standard recurring expense for this branch</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                Quick Template Suggestions:
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_BILLS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSuggestion(sug)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition border border-transparent hover:border-emerald-500/20"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    {sug.title} (৳{sug.defaultAmount.toLocaleString()})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Expense Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                    const Icon = meta.icon;
                    const isSelected = formData.category === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: catKey as any })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                        <span className="text-xs truncate">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Bill Name / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop Rent, DESCO Electricity, Fiber Internet"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>

              {/* Estimated Amount & Due Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Estimated Amount (৳) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0.00"
                      value={formData.estimatedAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimatedAmount: e.target.value === "" ? "" : parseFloat(e.target.value),
                        })
                      }
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Due Day of Month (1 - 31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="e.g. 5 or 10"
                    value={formData.dueDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dueDay: e.target.value === "" ? "" : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Notes / Account / Meter Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Landlord account #, Meter Number, ISP Customer ID"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Recurring Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
