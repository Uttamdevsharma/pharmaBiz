"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  Plus,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Landmark,
  FileText,
  Copy,
  Check,
} from "lucide-react";

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  description?: string | null;
  branchId: string;
  branch?: { id: string; name: string };
  branchNameStr?: string;
}

interface FinancialAccountsViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

const COMMON_BANKS = [
  "Dutch-Bangla Bank (DBBL)",
  "BRAC Bank",
  "City Bank",
  "Eastern Bank PLC (EBL)",
  "Islami Bank Bangladesh",
  "Standard Chartered",
  "Mutual Trust Bank (MTB)",
  "United Commercial Bank (UCB)",
  "Prime Bank",
  "Dhaka Bank",
  "Southeast Bank",
  "Sonali Bank",
];

export function FinancialAccountsView({ onNavigate }: FinancialAccountsViewProps) {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form state
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "BANK",
    bankName: "",
    accountNumber: "",
    branchName: "",
    routingNumber: "",
    initialBalance: 0,
    isDefault: false,
    description: "",
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedBranchId
        ? `/accounting/accounts?branchId=${selectedBranchId}`
        : "/accounting/accounts";
      const res = await fetchApi<FinancialAccount[]>(url);
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const bRes = await fetchApi<any[]>("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (!selectedBranchId) {
            setSelectedBranchId(bRes.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadAccounts();
    }
  }, [selectedBranchId]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData({
      name: "",
      type: "BANK",
      bankName: "",
      accountNumber: "",
      branchName: "",
      routingNumber: "",
      initialBalance: 0,
      isDefault: false,
      description: "",
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleOpenEdit = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setFormData({
      name: acc.name,
      type: acc.type,
      bankName: acc.bankName || "",
      accountNumber: acc.accountNumber || "",
      branchName: acc.branchName || "",
      routingNumber: acc.routingNumber || "",
      initialBalance: Number(acc.balance),
      isDefault: acc.isDefault,
      description: acc.description || "",
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleQuickTemplate = (presetType: "CASH" | "BKASH" | "NAGAD" | "DBBL" | "CITY" | "BRAC") => {
    if (presetType === "CASH") {
      setFormData({
        ...formData,
        type: "CASH",
        name: "Main Cash Drawer",
        bankName: "",
        accountNumber: "",
        branchName: "",
        routingNumber: "",
        description: "Counter cash register for physical cash sales",
      });
    } else if (presetType === "BKASH") {
      setFormData({
        ...formData,
        type: "BKASH",
        name: "bKash Merchant Account",
        bankName: "",
        accountNumber: "",
        branchName: "",
        routingNumber: "",
        description: "bKash digital payment gateway & wallet",
      });
    } else if (presetType === "NAGAD") {
      setFormData({
        ...formData,
        type: "NAGAD",
        name: "Nagad Merchant Account",
        bankName: "",
        accountNumber: "",
        branchName: "",
        routingNumber: "",
        description: "Nagad digital payment gateway & wallet",
      });
    } else if (presetType === "DBBL") {
      setFormData({
        ...formData,
        type: "BANK",
        name: "Dutch-Bangla Bank (DBBL)",
        bankName: "Dutch-Bangla Bank (DBBL)",
        accountNumber: "",
        branchName: "",
        routingNumber: "",
        description: "DBBL corporate bank account",
      });
    } else if (presetType === "CITY") {
      setFormData({
        ...formData,
        type: "BANK",
        name: "City Bank Account",
        bankName: "City Bank",
        accountNumber: "",
        branchName: "",
        routingNumber: "",
        description: "City Bank corporate bank account",
      });
    } else if (presetType === "BRAC") {
      setFormData({
        ...formData,
        type: "BANK",
        name: "BRAC Bank Account",
        bankName: "BRAC Bank",
        accountNumber: "",
        branchName: "",
        routingNumber: "",
        description: "BRAC Bank corporate bank account",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Account name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingAccount) {
        const res = await fetchApi(`/accounting/accounts/${editingAccount.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            bankName: formData.bankName || null,
            accountNumber: formData.accountNumber || null,
            branchName: formData.branchName || null,
            routingNumber: formData.routingNumber || null,
            isDefault: formData.isDefault,
            description: formData.description || null,
          }),
        });
        if (!res.success) throw new Error(res.message || "Failed to update account");
        setSuccessMsg(`Account "${formData.name}" updated successfully`);
      } else {
        const res = await fetchApi("/accounting/accounts", {
          method: "POST",
          body: JSON.stringify({
            branchId: selectedBranchId,
            name: formData.name,
            type: formData.type,
            bankName: formData.bankName || null,
            accountNumber: formData.accountNumber || null,
            branchName: formData.branchName || null,
            routingNumber: formData.routingNumber || null,
            isDefault: formData.isDefault,
            initialBalance: Number(formData.initialBalance) || 0,
            description: formData.description || null,
          }),
        });
        if (!res.success) throw new Error(res.message || "Failed to create account");
        setSuccessMsg(`Account "${formData.name}" created successfully`);
      }

      setIsModalOpen(false);
      loadAccounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetchApi(`/accounting/accounts/${accountToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to remove account");
      }

      setSuccessMsg(`Account "${accountToDelete.name}" removed successfully.`);
      setAccountToDelete(null);
      loadAccounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || "Failed to remove account");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (typeFilter !== "ALL") {
      if (typeFilter === "BANK" && acc.type !== "BANK" && acc.type !== "CARD_SETTLEMENT") return false;
      if (typeFilter === "MOBILE" && acc.type !== "BKASH" && acc.type !== "NAGAD" && acc.type !== "MOBILE") return false;
      if (typeFilter === "CASH" && acc.type !== "CASH") return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      acc.name?.toLowerCase().includes(q) ||
      acc.bankName?.toLowerCase().includes(q) ||
      acc.accountNumber?.toLowerCase().includes(q) ||
      acc.type?.toLowerCase().includes(q)
    );
  });

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalCash = accounts
    .filter((a) => a.type === "CASH")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalBank = accounts
    .filter((a) => a.type === "BANK" || a.type === "CARD_SETTLEMENT")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalMobile = accounts
    .filter((a) => a.type === "BKASH" || a.type === "NAGAD" || a.type === "MOBILE")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const getAccountBadge = (type: string, name: string) => {
    const t = String(type).toUpperCase();
    const n = name.toLowerCase();
    if (t === "CASH") {
      return {
        label: "Cash Drawer",
        bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-800/40",
        icon: Banknote,
      };
    }
    if (t === "BKASH" || (t === "MOBILE" && n.includes("bkash"))) {
      return {
        label: "bKash Wallet",
        bg: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
        border: "border-pink-200 dark:border-pink-800/40",
        icon: Smartphone,
      };
    }
    if (t === "NAGAD" || (t === "MOBILE" && n.includes("nagad"))) {
      return {
        label: "Nagad Wallet",
        bg: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
        border: "border-orange-200 dark:border-orange-800/40",
        icon: Smartphone,
      };
    }
    return {
      label: "Bank Account",
      bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800/40",
      icon: Building2,
    };
  };

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 2xl:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-6 w-6 xl:h-7 xl:w-7 text-emerald-600 dark:text-emerald-400" />
              Financial Accounts & Wallets
            </h1>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs xl:text-sm px-2.5 py-0.5 rounded-full font-bold">
              {accounts.length} Active {accounts.length === 1 ? "Account" : "Accounts"}
            </span>
          </div>
          <p className="text-xs xl:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your pharmacy cash drawers, bKash/Nagad digital wallets, and multiple dedicated bank accounts (DBBL, City Bank, BRAC Bank, etc.).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-2 xl:px-3.5 xl:py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs xl:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadAccounts}
            className="p-2.5 xl:p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Balances"
          >
            <RefreshCw className={`h-4 w-4 xl:h-4.5 xl:w-4.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_fund_transfer")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 xl:px-4 xl:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs xl:text-sm font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
            >
              <ArrowLeftRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Transfer Funds
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 xl:px-5 xl:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs xl:text-sm font-bold shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4 xl:h-5 xl:w-5" />
            Add Account / Bank
          </button>
        </div>
      </div>

      {/* Global Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts by name, bank, account number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "ALL", label: "All Accounts" },
            { id: "BANK", label: "Banks" },
            { id: "CASH", label: "Cash" },
            { id: "MOBILE", label: "Digital Wallets" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                typeFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
          <p className="text-xs font-bold">Synchronizing financial accounts & live balances...</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Wallet className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Financial Accounts Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {search || typeFilter !== "ALL"
              ? "No accounts match your current search or filter criteria."
              : "Get started by creating your pharmacy financial accounts (Cash, bKash, Nagad, DBBL, City Bank, BRAC Bank, etc.)."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition"
          >
            <Plus className="h-4 w-4" />
            Create First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 2xl:gap-6">
          {filteredAccounts.map((acc) => {
            const badge = getAccountBadge(acc.type, acc.name);
            const BadgeIcon = badge.icon;
            const balanceNum = Number(acc.balance || 0);

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${badge.bg}`}>
                        <BadgeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                            {acc.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.bg}`}>
                            {badge.label}
                          </span>
                          {acc.isDefault && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Edit and Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Account Details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAccountToDelete(acc);
                          setDeleteError(null);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Remove Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Account Metadata details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                    {acc.bankName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">Bank:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{acc.bankName}</span>
                      </div>
                    )}
                    {acc.accountNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">Account / No:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{acc.accountNumber}</span>
                          <button
                            onClick={() => handleCopy(acc.accountNumber!, acc.id)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 transition"
                            title="Copy Account Number"
                          >
                            {copiedId === acc.id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {acc.branchName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">Branch:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">{acc.branchName}</span>
                      </div>
                    )}
                    {acc.routingNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">Routing No:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">{acc.routingNumber}</span>
                      </div>
                    )}
                    {acc.description && (
                      <div className="text-[11px] text-slate-400 italic pt-1 truncate">{acc.description}</div>
                    )}
                  </div>
                </div>

                {/* Balance & Transfer CTA */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Balance</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{balanceNum.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate("acc_fund_transfer")}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-emerald-600 hover:text-white transition flex items-center gap-1"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Transfer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="h-5 w-5 text-emerald-600" />
                {editingAccount ? "Edit Financial Account" : "Add New Financial Account / Bank"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Template Chips for New Account */}
            {!editingAccount && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Account Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "CASH", label: "💵 Cash Drawer", color: "hover:border-emerald-500" },
                    { id: "BKASH", label: "📱 bKash", color: "hover:border-pink-500" },
                    { id: "NAGAD", label: "📱 Nagad", color: "hover:border-orange-500" },
                    { id: "DBBL", label: "🏦 DBBL Bank", color: "hover:border-blue-500" },
                    { id: "CITY", label: "🏦 City Bank", color: "hover:border-blue-500" },
                    { id: "BRAC", label: "🏦 BRAC Bank", color: "hover:border-blue-500" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleQuickTemplate(preset.id as any)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition ${preset.color}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Type *
                </label>
                <select
                  disabled={Boolean(editingAccount)}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white disabled:opacity-60"
                >
                  <option value="BANK">Bank Account (DBBL, City Bank, BRAC, etc.)</option>
                  <option value="BKASH">bKash Merchant / Personal Account</option>
                  <option value="NAGAD">Nagad Merchant / Personal Account</option>
                  <option value="CASH">Cash Drawer / Counter Cash</option>
                  <option value="CARD_SETTLEMENT">Card / POS Settlement Account</option>
                  <option value="OTHER">Other Financial Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Display Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. DBBL Principal Branch, Counter Cash, bKash Merchant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-medium"
                  required
                />
              </div>

              {formData.type === "BANK" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      list="bank-suggestions"
                      placeholder="e.g. Dutch-Bangla Bank (DBBL), City Bank, BRAC Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                    />
                    <datalist id="bank-suggestions">
                      {COMMON_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 102.120.45678"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dhanmondi Branch"
                        value={formData.branchName}
                        onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Routing Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 09027123"
                      value={formData.routingNumber}
                      onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {(formData.type === "BKASH" || formData.type === "NAGAD" || formData.type === "MOBILE") && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Merchant / Wallet Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 01700-000000"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono"
                  />
                </div>
              )}

              {!editingAccount && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Initial Balance (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Notes or purpose of this account"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultAccount"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isDefaultAccount" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Set as default account for this payment type
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingAccount ? "Update Account" : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Remove Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Remove Account</h3>
                <p className="text-xs text-slate-400">Safe financial account deactivation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">&ldquo;{accountToDelete.name}&rdquo;</strong>?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{Number(accountToDelete.balance).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                🔒 Safe removal: Existing sales, ledger transactions, and transfer history associated with this account will remain intact.
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
