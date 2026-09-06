"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  History,
  DollarSign,
  Briefcase,
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  Loader2,
  RefreshCw,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface DisbursementItem {
  id: string;
  month: string;
  baseAmount: number;
  allowances: number;
  deductions: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: "PAID" | "PARTIAL" | "DUE";
  paymentDate: string;
  paymentRef?: string | null;
  notes?: string | null;
  financialAccount?: { id: string; name: string; type: string };
  disbursedBy?: { id: string; name?: string; username: string };
  branch?: { id: string; name: string };
}

interface SalaryPackage {
  id?: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
}

export function StaffSalaryHistoryView({ onBack }: { onBack?: () => void }) {
  const { user } = useAuth();
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [salaryConfig, setSalaryConfig] = useState<SalaryPackage | null>(null);
  const [summary, setSummary] = useState<{ totalDisbursed: number; totalPayments: number }>({
    totalDisbursed: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{
        employee: any;
        disbursements: DisbursementItem[];
        summary: { totalDisbursed: number; totalPayments: number };
      }>("/accounting/salaries/my-history");

      if (res.success && res.data) {
        setDisbursements(res.data.disbursements);
        setSalaryConfig(res.data.employee?.salaryConfig || null);
        setSummary(res.data.summary);
      } else {
        setError(res.message || "Failed to load your salary history");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load your salary history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <History className="h-6 w-6 text-brand-primary" />
              My Salary & Payment History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View your salary package details and complete historical payment receipts disbursed by your pharmacy management.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-500 transition shadow-xs self-start sm:self-auto"
          title="Refresh History"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Monthly Package */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Salary</span>
            <Briefcase className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ৳{salaryConfig ? Number(salaryConfig.netSalary).toLocaleString() : "—"}
          </div>
          <div className="text-xs text-slate-400">
            {salaryConfig
              ? `Base ৳${Number(salaryConfig.baseSalary).toLocaleString()} (Allowances +৳${Number(salaryConfig.allowances || 0).toLocaleString()})`
              : "Salary package not yet configured"}
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ৳{summary.totalDisbursed.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">
            {summary.totalPayments} total payment vouchers received
          </div>
        </div>

        {/* Payout Method */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Payment Channel</span>
            <Wallet className="h-4 w-4 text-teal-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white uppercase">
            {salaryConfig?.paymentMethod || "CASH"}
          </div>
          <div className="text-xs text-slate-400">
            {salaryConfig?.paymentDetails ? `Account: ${salaryConfig.paymentDetails}` : "Direct Counter Handover"}
          </div>
        </div>
      </div>

      {/* Historical Ledger Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-4 w-4 text-brand-primary" />
            Disbursement Vouchers
          </h2>
          <span className="text-xs text-slate-400">{disbursements.length} records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span className="text-xs">Loading payment records...</span>
          </div>
        ) : disbursements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No salary disbursement records found
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When monthly salary disbursements are paid by your Branch/Accounts Manager, your vouchers will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Paid Via</th>
                  <th className="py-3 px-4">Disbursed By</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {disbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {d.month}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(d.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {d.paymentRef || d.id.slice(0, 8)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        ৳{Number(d.paidAmount).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {d.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-brand-primary" />
                        <span>{d.financialAccount?.name || "Branch Account"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {d.disbursedBy?.name || d.disbursedBy?.username || "Management"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 italic text-[11px]">
                      {d.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
