"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  PlusCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Store,
} from "lucide-react";
import Swal from "sweetalert2";

interface CreateFinancialAccountViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

const BANGLADESH_BANKS = [
  "City Bank PLC",
  "Dutch-Bangla Bank (DBBL)",
  "BRAC Bank PLC",
  "Islami Bank Bangladesh",
  "Eastern Bank PLC (EBL)",
  "Sonali Bank PLC",
  "Prime Bank PLC",
  "United Commercial Bank (UCB)",
  "Standard Chartered Bangladesh",
  "Dhaka Bank PLC",
  "Southeast Bank PLC",
  "Mutual Trust Bank (MTB)",
  "Pubali Bank PLC",
  "Bank Asia PLC",
  "Janata Bank PLC",
  "Agrani Bank PLC",
  "Rupali Bank PLC",
  "Mercantile Bank PLC",
  "One Bank PLC",
  "Trust Bank PLC",
  "Other Commercial Bank",
];

const MFS_PROVIDERS = [
  { id: "BKASH", name: "bKash" },
  { id: "NAGAD", name: "Nagad" },
  { id: "ROCKET", name: "Rocket (DBBL)" },
  { id: "UPAY", name: "Upay" },
];

export function CreateFinancialAccountView({ onNavigate }: CreateFinancialAccountViewProps) {
  // Category Tab: CASH | BANK | MFS
  const [accountCategory, setAccountCategory] = useState<"CASH" | "BANK" | "MFS">("BANK");

  // Branches list
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Scope for digital/bank: CENTRAL (All branches) vs BRANCH
  const [accountScope, setAccountScope] = useState<"CENTRAL" | "BRANCH">("CENTRAL");

  // Form fields
  const [accountName, setAccountName] = useState("");
  const [selectedBank, setSelectedBank] = useState(BANGLADESH_BANKS[0]);
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [bankBranchName, setBankBranchName] = useState("");
  const [mfsProvider, setMfsProvider] = useState("BKASH");
  const [mfsType, setMfsType] = useState<"MERCHANT" | "PERSONAL" | "AGENT">("MERCHANT");
  const [walletNumber, setWalletNumber] = useState("");
  const [initialBalance, setInitialBalance] = useState<string>("0");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches
  useEffect(() => {
    fetchApi<any>("/branches")
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data);
          if (res.data.length > 0) {
            setSelectedBranchId(res.data[0].id);
          }
        }
      })
      .catch((err) => console.error("Failed to load branches", err));
  }, []);

  // Update default name when branch changes if CASH
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    if (accountCategory === "CASH") {
      const b = branches.find((item) => item.id === branchId);
      if (b) {
        setAccountName(`Cash Drawer - ${b.name}`);
      }
    }
  };

  const handleCategorySwitch = (cat: "CASH" | "BANK" | "MFS") => {
    setAccountCategory(cat);
    if (cat === "CASH") {
      const b = branches.find((item) => item.id === selectedBranchId) || branches[0];
      setAccountName(b ? `Cash Drawer - ${b.name}` : "Cash Drawer");
    } else {
      setAccountName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalName = accountName.trim();
    let finalType = "CASH";
    let finalBankName: string | null = null;
    let finalAccountNumber: string | null = null;
    let finalRoutingNumber: string | null = null;
    let finalBranchName: string | null = null;
    let finalBranchId = selectedBranchId;

    if (accountCategory === "CASH") {
      finalType = "CASH";
      if (!finalBranchId) {
        setError("Please select the specific branch for this cash drawer.");
        return;
      }
      if (!finalName) {
        const b = branches.find((item) => item.id === finalBranchId);
        finalName = b ? `Cash Drawer - ${b.name}` : "Branch Cash Drawer";
      }
    } else if (accountCategory === "BANK") {
      finalType = "BANK";
      finalBankName = selectedBank === "Other Commercial Bank" ? customBankName.trim() : selectedBank;
      if (!finalBankName) {
        setError("Please specify the bank name.");
        return;
      }
      if (!accountNumber.trim()) {
        setError("Bank Account Number is required.");
        return;
      }
      finalAccountNumber = accountNumber.trim();
      finalRoutingNumber = routingNumber.trim() || null;
      finalBranchName = bankBranchName.trim() || null;
      if (!finalName) {
        finalName = `${finalBankName} - ${finalAccountNumber.slice(-4)}`;
      }
      // If Central, branchId defaults to the first branch (head branch) for relation constraints
      if (accountScope === "CENTRAL" && branches.length > 0) {
        finalBranchId = branches[0].id;
      }
    } else if (accountCategory === "MFS") {
      finalType = mfsProvider === "BKASH" ? "BKASH" : mfsProvider === "NAGAD" ? "NAGAD" : "MOBILE";
      if (!walletNumber.trim()) {
        setError("Mobile Wallet Number is required.");
        return;
      }
      finalAccountNumber = walletNumber.trim();
      const provName = MFS_PROVIDERS.find((p) => p.id === mfsProvider)?.name || mfsProvider;
      if (!finalName) {
        finalName = `${provName} ${mfsType === "MERCHANT" ? "Merchant" : mfsType === "AGENT" ? "Agent" : "Personal"} (${walletNumber.slice(-4)})`;
      }
      if (accountScope === "CENTRAL" && branches.length > 0) {
        finalBranchId = branches[0].id;
      }
    }

    const balanceNum = parseFloat(initialBalance) || 0;

    try {
      setSubmitting(true);
      const res = await fetchApi<any>("/accounting/accounts", {
        method: "POST",
        body: JSON.stringify({
          branchId: finalBranchId,
          name: finalName,
          type: finalType,
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
          routingNumber: finalRoutingNumber,
          branchName: finalBranchName,
          initialBalance: balanceNum,
          description: description.trim() || undefined,
          isDefault,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create financial account");
      }

      Swal.fire({
        icon: "success",
        title: "Account Created",
        text: `"${finalName}" has been successfully configured.`,
        confirmButtonColor: "#10b981",
        customClass: {
          popup: "rounded-none",
          confirmButton: "rounded-none",
        },
      });

      if (onNavigate) {
        onNavigate("acc_financial_accounts");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while creating the account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-emerald-600" />
          Create Financial Account
        </h1>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("acc_financial_accounts")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Accounts
          </button>
        )}
      </div>

      {/* Account Type Selector Tabs - Sharp, Rounded None */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-none">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleCategorySwitch("BANK")}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-none transition border ${
              accountCategory === "BANK"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Bank Account</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategorySwitch("CASH")}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-none transition border ${
              accountCategory === "CASH"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Banknote className="h-4 w-4" />
            <span>Branch Cash Drawer</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategorySwitch("MFS")}
            className={`flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-none transition border ${
              accountCategory === "MFS"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Mobile Banking (bKash/Nagad)</span>
          </button>
        </div>
      </div>

      {/* Main Account Form Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-none">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-none">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* 1. CASH DRAWER FIELDS (Branch Selection Mandatory) */}
          {accountCategory === "CASH" && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-none space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-emerald-600" />
                    Select Branch (শাখা) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                    required
                  >
                    {branches.length === 0 && <option value="">No branches found</option>}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Cash Drawer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash Drawer - Dhanmondi"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white font-medium"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. BANK ACCOUNT FIELDS */}
          {accountCategory === "BANK" && (
            <div className="space-y-4">
              {/* Account Scope Toggle */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none text-xs sm:text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">Account Scope:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="bankScope"
                    checked={accountScope === "CENTRAL"}
                    onChange={() => setAccountScope("CENTRAL")}
                    className="rounded-none text-emerald-600"
                  />
                  <span>Central / All Branches (Owner Account)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="bankScope"
                    checked={accountScope === "BRANCH"}
                    onChange={() => setAccountScope("BRANCH")}
                    className="rounded-none text-emerald-600"
                  />
                  <span>Specific Branch Only</span>
                </label>
              </div>

              {accountScope === "BRANCH" && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                  >
                    {BANGLADESH_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBank === "Other Commercial Bank" && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Custom Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Standard Bank Limited"
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bank Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1501203456789001"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Display Name / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. City Bank - Corporate Current"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Bank Branch Name <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Branch"
                    value={bankBranchName}
                    onChange={(e) => setBankBranchName(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Routing Number <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 090271234"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-mono outline-none focus:border-emerald-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. MFS FIELDS */}
          {accountCategory === "MFS" && (
            <div className="space-y-4">
              {/* Account Scope Toggle */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none text-xs sm:text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">Wallet Scope:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="mfsScope"
                    checked={accountScope === "CENTRAL"}
                    onChange={() => setAccountScope("CENTRAL")}
                    className="rounded-none text-emerald-600"
                  />
                  <span>Central / All Branches (Owner Wallet)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="mfsScope"
                    checked={accountScope === "BRANCH"}
                    onChange={() => setAccountScope("BRANCH")}
                    className="rounded-none text-emerald-600"
                  />
                  <span>Specific Branch Only</span>
                </label>
              </div>

              {accountScope === "BRANCH" && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    MFS Provider <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mfsProvider}
                    onChange={(e) => setMfsProvider(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
                  >
                    {MFS_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mfsType}
                    onChange={(e) => setMfsType(e.target.value as any)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
                  >
                    <option value="MERCHANT">Merchant Account</option>
                    <option value="PERSONAL">Personal Wallet</option>
                    <option value="AGENT">Agent Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mobile Wallet Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 017XXXXXXXX"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-mono outline-none focus:border-emerald-600 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Title <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. bKash Merchant (All Branches)"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* SHARED FIELDS: Opening Balance & Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Opening Balance (৳)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full h-9 sm:h-10 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-bold font-mono outline-none focus:border-emerald-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description / Purpose <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Counter cash / primary settlement"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-emerald-600 dark:text-white"
              />
            </div>
          </div>

          {/* Set as Default Option */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultAccount"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded-none border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="isDefaultAccount"
              className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              Set as Default Financial Account
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-none cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Save & Create Financial Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
