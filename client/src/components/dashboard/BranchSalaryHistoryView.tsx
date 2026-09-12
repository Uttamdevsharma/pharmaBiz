"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  Search,
  Filter,
  Calendar,
  Wallet,
  Receipt,
  Users,
  DollarSign,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Building,
  Check,
  Briefcase,
  Download,
  Info,
  Store,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";

interface BranchSalaryHistoryViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectEmployee?: (employeeId: string) => void;
}

interface DisbursementItem {
  id: string;
  month: string;
  baseAmount: number;
  allowances: number;
  deductions: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: "PAID" | "PARTIAL";
  paymentDate: string;
  paymentRef?: string | null;
  notes?: string | null;
  user: {
    id: string;
    name?: string;
    username: string;
    phone?: string;
    role: string;
    customRoleName?: string;
    pharmacyRoleName?: string;
  };
  financialAccount: {
    id: string;
    name: string;
    type: string;
    accountNumber?: string;
    bankName?: string;
  };
  disbursedBy?: {
    id: string;
    name?: string;
    username: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  };
}

export function BranchSalaryHistoryView({
  selectedBranchId: propBranchId,
  onNavigate,
  onSelectEmployee,
}: BranchSalaryHistoryViewProps) {
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Voucher Slip Modal
  const [selectedSlip, setSelectedSlip] = useState<DisbursementItem | null>(null);

  const loadSalaryHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/accounting/salaries/branch-history?limit=100`;
      if (effectiveBranchId && effectiveBranchId !== "all") {
        url += `&branchId=${effectiveBranchId}`;
      }
      if (currentMonth) {
        url += `&month=${currentMonth}`;
      }
      const res = await fetchApi<{ items: DisbursementItem[]; totalDisbursed: number; pagination: any }>(url);
      if (res.success && res.data) {
        setDisbursements(res.data.items || []);
        setTotalDisbursed(res.data.totalDisbursed || 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load salary history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaryHistory();
  }, [effectiveBranchId, currentMonth]);

  const filteredItems = disbursements.filter((item) => {
    const q = searchQuery.toLowerCase();
    const staffName = item.user?.name?.toLowerCase() || "";
    const username = item.user?.username?.toLowerCase() || "";
    const voucher = item.paymentRef?.toLowerCase() || item.id.toLowerCase();
    const account = item.financialAccount?.name?.toLowerCase() || "";
    return staffName.includes(q) || username.includes(q) || voucher.includes(q) || account.includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Salary History</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Complete branch-wide ledger of all salary disbursements and payment vouchers debited from branch accounts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
            <Store className="h-4 w-4 text-purple-500" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches (Company-Wide)" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              placeholder="All Months"
              className="bg-transparent border-none text-sm font-semibold focus:outline-none dark:text-white cursor-pointer"
            />
            {currentMonth && (
              <button
                onClick={() => setCurrentMonth("")}
                className="text-xs text-slate-400 hover:text-slate-600 ml-1"
                title="Clear month filter"
              >
                ✕ All
              </button>
            )}
          </div>

          <button
            onClick={() => onNavigate?.("sal_management")}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            <DollarSign className="w-4 h-4" />
            Salary Management
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

      {/* Audit Assurance Banner */}
      <div className="flex items-start gap-3 p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-800 dark:text-purple-300">
        <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Permanent Salary Ledger:</span> Every disbursement row records the exact amount debited from your branch financial account, the disbursement manager, and the voucher reference.
        </div>
      </div>



      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by staff name, voucher #, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-white"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Showing {filteredItems.length} of {disbursements.length} records
        </span>
      </div>

      {/* Disbursements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading salary disbursement history...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-purple-500/10 text-purple-600 rounded-2xl mb-4">
              <History className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No salary disbursements found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              {searchQuery || currentMonth
                ? "No disbursements match your search filters."
                : "No staff salary payments have been recorded for this branch yet."}
            </p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[850px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Payment Date & Voucher</th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Salary Month</th>
                  <th className="py-3.5 px-4">Paid From Account</th>
                  <th className="py-3.5 px-4">Disbursed By</th>
                  <th className="py-3.5 px-4 text-right">Amount Paid</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        {new Date(item.paymentDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.paymentRef || `VCH-${item.id.slice(0, 8).toUpperCase()}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.user?.name || item.user?.username}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.user?.customRoleName || item.user?.pharmacyRoleName || item.user?.role?.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-xs px-2.5 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-lg">
                        {item.month}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-blue-500" />
                        {item.financialAccount?.name}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {item.financialAccount?.type} {item.financialAccount?.bankName ? `• ${item.financialAccount.bankName}` : ""}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {item.disbursedBy?.name || item.disbursedBy?.username || "Manager"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        ৳{Number(item.paidAmount).toLocaleString()}
                      </span>
                      {Number(item.dueAmount) > 0 && (
                        <div className="text-[11px] text-amber-500 font-semibold">
                          Due: ৳{Number(item.dueAmount).toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedSlip(item)}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-500/10 hover:text-purple-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                        title="View Disbursement Voucher Slip"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Voucher Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Salary Payment Voucher</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref: {selectedSlip.paymentRef || selectedSlip.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlip(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Slip Content */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Employee Details</span>
                  <div className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedSlip.user?.name || selectedSlip.user?.username}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedSlip.user?.customRoleName || selectedSlip.user?.role?.replace("_", " ")}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Salary Month</span>
                  <div className="font-extrabold text-sm text-purple-600 dark:text-purple-400">
                    {selectedSlip.month}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(selectedSlip.paymentDate).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Payable for Month:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ৳{Number(selectedSlip.netPayable).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Paid Amount (Debited):</span>
                  <span className="text-sm">৳{Number(selectedSlip.paidAmount).toLocaleString()}</span>
                </div>
                {Number(selectedSlip.dueAmount) > 0 && (
                  <div className="flex justify-between text-amber-600 font-semibold">
                    <span>Remaining Balance Due:</span>
                    <span>৳{Number(selectedSlip.dueAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Paid from Account:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedSlip.financialAccount?.name} ({selectedSlip.financialAccount?.type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Disbursed By:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {selectedSlip.disbursedBy?.name || selectedSlip.disbursedBy?.username || "Manager"}
                  </span>
                </div>
                {selectedSlip.notes && (
                  <div className="pt-2 text-slate-500 italic">
                    &ldquo;{selectedSlip.notes}&rdquo;
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-purple-600/20"
              >
                <Printer className="w-4 h-4" />
                Print Voucher Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
