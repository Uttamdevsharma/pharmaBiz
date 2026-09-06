"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import {
  CreditCard,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building,
  X,
  RefreshCw,
  TrendingDown,
  DollarSign,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

interface PaymentsDueViewProps {
  onNavigate?: (module: any) => void;
}

export function PaymentsDueView({ onNavigate: _onNavigate }: PaymentsDueViewProps = {}) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dueStatusFilter, setDueStatusFilter] = useState<"ALL" | "DUE" | "SETTLED">("ALL");

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSuppliers = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetchApi<any>(`/suppliers?${params.toString()}`);
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error("Failed to load suppliers due ledger", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetchApi<any[]>("/branches");
        if (res.success && res.data && res.data.length > 0) {
          setBranches(res.data);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    loadBranches();
  }, [user]);

  useEffect(() => {
    async function loadAccounts() {
      if (!selectedBranchId) return;
      try {
        const res = await fetchApi<any[]>(`/accounting/accounts?branchId=${selectedBranchId}`);
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
  }, [selectedBranchId]);

  const totalOutstandingDue = suppliers.reduce((acc, s) => acc + Number(s.totalDue || 0), 0);
  const totalPurchases = suppliers.reduce((acc, s) => acc + Number(s.totalPurchased || 0), 0);
  const totalPaid = suppliers.reduce((acc, s) => acc + Number(s.totalPaid || 0), 0);
  const dueSuppliers = suppliers.filter((s) => Number(s.totalDue || 0) > 0);

  const filteredSuppliers = suppliers.filter((s) => {
    const due = Number(s.totalDue || 0);
    if (dueStatusFilter === "DUE" && due <= 0) return false;
    if (dueStatusFilter === "SETTLED" && due > 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenPay = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setPayAmount(Number(sup.totalDue || 0));
    setPayNotes(`Settlement payment for ${sup.name}`);
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) return;
    if (!selectedAccountId) {
      alert("A valid financial account created for the selected branch is required to record supplier payment.");
      return;
    }
    try {
      setPaying(true);
      const res = await fetchApi<any>(`/suppliers/${selectedSupplier.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          branchId: selectedBranchId,
          financialAccountId: selectedAccountId,
          notes: payNotes || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to record payment");

      setSuccess(`Payment of ৳${payAmount.toFixed(2)} recorded for ${selectedSupplier.name}!`);
      setPayModalOpen(false);
      setSelectedSupplier(null);
      loadSuppliers(true);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs xl:text-sm text-slate-400 mb-1">
            <span>Accounts & Finance</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Supplier Payments & Dues</span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 xl:h-8 xl:w-8 text-emerald-600 dark:text-emerald-400" />
            Supplier Payments / Due
          </h1>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 dark:text-slate-400 mt-1">
            Monitor wholesale distributor credit balances, execute settlement payments, and synchronize financial ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSuppliers(true)}
            disabled={refreshing}
            className="px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs xl:text-sm font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 xl:h-4 xl:w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-950 shadow-sm">
          <div className="flex items-center justify-between text-xs text-rose-500 font-bold uppercase tracking-wider">
            <span>Outstanding Due Balance</span>
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">
            ৳{totalOutstandingDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pending across {dueSuppliers.length} suppliers</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Total Purchases</span>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2">
            ৳{totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Lifetime wholesale procurement</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Total Payments Made</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            ৳{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Settled purchase payments</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Due Accounts</span>
            <Building className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {dueSuppliers.length} / {suppliers.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Suppliers with active credit</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier, company, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadSuppliers(true)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: "ALL", label: "All Suppliers" },
            { id: "DUE", label: "With Pending Due" },
            { id: "SETTLED", label: "Fully Settled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDueStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dueStatusFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due Accounts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="h-5 w-5 text-emerald-600" />
            Supplier Accounts Payable Ledger
          </h3>
          <span className="text-xs text-slate-400 font-bold">{filteredSuppliers.length} records</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-xs font-bold">Querying dues ledger...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching supplier records</p>
            <p className="text-xs mt-1 text-slate-400">All supplier balances are reconciled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Supplier / Company Name</th>
                  <th className="py-3.5 px-4">Contact Person & Phone</th>
                  <th className="py-3.5 px-4 text-right">Total Purchases</th>
                  <th className="py-3.5 px-4 text-right">Total Paid</th>
                  <th className="py-3.5 px-4 text-right">Outstanding Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredSuppliers.map((s) => {
                  const total = Number(s.totalPurchased || 0);
                  const paid = Number(s.totalPaid || 0);
                  const due = Number(s.totalDue || 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                        {s.company && s.company !== s.name && (
                          <div className="text-[10px] text-slate-400">{s.company}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{s.contactPerson || "Direct"}</div>
                        {s.phone && (
                          <div className="font-mono text-slate-400 text-[11px] mt-0.5">{s.phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳{total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                        ৳{paid.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {due > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-black text-sm">৳{due.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">৳0.00</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            due > 0
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                          }`}
                        >
                          {due > 0 ? "Pending Due" : "Settled"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {due > 0 ? (
                          <button
                            onClick={() => handleOpenPay(s)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 ml-auto active:scale-95"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay Due
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">Cleared</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Due Modal */}
      {payModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Record Supplier Payment</h3>
                  <p className="text-xs text-slate-400">{selectedSupplier.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Current Outstanding Due:</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                  ৳{Number(selectedSupplier.totalDue || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Payment Amount (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                  min="1"
                  max={Number(selectedSupplier.totalDue || 9999999)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Select Paying Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Payment Financial Account (Debited) *
                </label>
                {financialAccounts.length === 0 ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold">
                    ⚠️ No active financial account created for this branch. Please create an account in Accounts & Finance first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {financialAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}){acc.accountNumber ? ` - A/C: ${acc.accountNumber}` : ""} [Balance: ৳{Number(acc.balance).toFixed(2)}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Payment Notes / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #88492 or Cash settlement voucher"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying || financialAccounts.length === 0 || !selectedAccountId}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {paying && <Loader2 className="h-4 w-4 animate-spin" />}
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
