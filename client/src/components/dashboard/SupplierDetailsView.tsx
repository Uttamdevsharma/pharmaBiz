"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier, SupplierContact } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/lib/swal";
import {
  Building,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  User,
  Plus,
  Receipt,
  CreditCard,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  X,
  FileText,
  Calendar,
  Filter,
  Check,
  Ban,
  DollarSign,
  TrendingDown,
  Package,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface SupplierDetailsViewProps {
  supplierId: string;
  onBack: () => void;
  onNavigate?: (module: any, extra?: any) => void;
}

type DatePreset = "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM" | "ALL";

function getDateRangeForPreset(preset: DatePreset, customStart?: string, customEnd?: string) {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (preset === "TODAY") {
    const todayStr = formatYMD(now);
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === "YESTERDAY") {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatYMD(yest);
    return { startDate: yestStr, endDate: yestStr };
  }
  if (preset === "THIS_MONTH") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: formatYMD(firstDay), endDate: formatYMD(now) };
  }
  if (preset === "THIS_YEAR") {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return { startDate: formatYMD(firstDay), endDate: formatYMD(now) };
  }
  if (preset === "CUSTOM") {
    return { startDate: customStart || "", endDate: customEnd || "" };
  }
  return { startDate: "", endDate: "" };
}

export function SupplierDetailsView({ supplierId, onBack, onNavigate }: SupplierDetailsViewProps) {
  const { user } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Date Filter Preset for Purchases
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Contact Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    designation: "Sales Representative (SR)",
  });
  const [savingContact, setSavingContact] = useState(false);

  // Edit Supplier Profile Modal
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Pay Due Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [paying, setPaying] = useState(false);

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Purchase History Pagination
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(10);

  useEffect(() => {
    setPurchasePage(1);
  }, [datePreset, customStartDate, customEndDate, supplierId]);

  const loadSupplierData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRangeForPreset(datePreset, customStartDate, customEndDate);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetchApi<Supplier>(`/suppliers/${supplierId}?${params.toString()}`);
      if (res.success && res.data) {
        setSupplier(res.data);
      } else {
        throw new Error(res.message || "Failed to load supplier profile");
      }
    } catch (err: any) {
      setError(err.message || "Could not load supplier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplierData();
  }, [supplierId, datePreset, customStartDate, customEndDate]);

  // Load branches & accounts for payment modal
  useEffect(() => {
    async function loadPaymentPrereqs() {
      try {
        const bRes = await fetchApi<any[]>("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || bRes.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadPaymentPrereqs();
  }, [user]);

  useEffect(() => {
    if (!selectedBranchId) return;
    async function loadAccounts() {
      try {
        const aRes = await fetchApi<any[]>(`/accounting/accounts?branchId=${selectedBranchId}`);
        if (aRes.success && aRes.data) {
          setFinancialAccounts(aRes.data);
          if (aRes.data.length > 0) {
            setSelectedAccountId(aRes.data[0].id);
          } else {
            setSelectedAccountId("");
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadAccounts();
  }, [selectedBranchId]);

  // Contact Handlers
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactForm({
      name: "",
      phone: "",
      email: "",
      designation: "Sales Representative (SR)",
    });
    setContactModalOpen(true);
  };

  const handleOpenEditContact = (c: SupplierContact) => {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      designation: c.designation || "Sales Representative (SR)",
    });
    setContactModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) return;

    try {
      setSavingContact(true);
      if (editingContact) {
        const res = await fetchApi(`/suppliers/${supplierId}/contacts/${editingContact.id}`, {
          method: "PATCH",
          body: JSON.stringify(contactForm),
        });
        if (!res.success) throw new Error(res.message || "Failed to update contact");
        const msg = `Contact "${contactForm.name}" updated successfully!`;
        setSuccess(msg);
        showAlert.success("Contact Updated", msg);
      } else {
        const res = await fetchApi(`/suppliers/${supplierId}/contacts`, {
          method: "POST",
          body: JSON.stringify(contactForm),
        });
        if (!res.success) throw new Error(res.message || "Failed to add contact");
        const msg = `Contact "${contactForm.name}" added successfully!`;
        setSuccess(msg);
        showAlert.success("Contact Added", msg);
      }

      setContactModalOpen(false);
      loadSupplierData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      showAlert.error("Operation Failed", err.message || "Failed to save contact");
    } finally {
      setSavingContact(false);
    }
  };

  const handleToggleContactStatus = async (contact: SupplierContact) => {
    const nextStatus = !contact.isActive;
    const actionLabel = nextStatus ? "activate" : "deactivate";
    const confirmed = await showAlert.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} Contact?`,
      `Are you sure you want to ${actionLabel} contact "${contact.name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetchApi(`/suppliers/${supplierId}/contacts/${contact.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus }),
      });
      if (res.success) {
        const msg = `Contact "${contact.name}" ${nextStatus ? "activated" : "deactivated"}!`;
        setSuccess(msg);
        showAlert.success("Status Updated", msg);
        loadSupplierData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        showAlert.error("Failed", res.message || "Failed to update contact status");
      }
    } catch (err: any) {
      showAlert.error("Error", err.message || "Update error");
    }
  };

  // Edit Supplier Profile Handlers
  const handleOpenEditProfile = () => {
    if (!supplier) return;
    setProfileForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
    setEditProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;

    try {
      setSavingProfile(true);
      const res = await fetchApi(`/suppliers/${supplierId}`, {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      if (!res.success) throw new Error(res.message || "Failed to update supplier profile");

      const msg = "Supplier company details updated successfully!";
      setSuccess(msg);
      showAlert.success("Supplier Updated", msg);
      setEditProfileModalOpen(false);
      loadSupplierData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      showAlert.error("Update Failed", err.message || "Failed to update supplier profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Pay Due Handlers
  const handleOpenPayModal = () => {
    if (!supplier) return;
    setPayAmount(Number(supplier.totalDue || 0));
    setPayNotes(`Settlement payment for ${supplier.name}`);
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || payAmount <= 0) return;
    if (!selectedAccountId) {
      showAlert.error("Account Required", "A valid financial account created for the selected branch is required to record supplier payment.");
      return;
    }

    try {
      setPaying(true);
      const res = await fetchApi(`/suppliers/${supplierId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          branchId: selectedBranchId,
          financialAccountId: selectedAccountId,
          notes: payNotes || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Payment recording failed");

      const msg = `Payment of ৳${payAmount.toFixed(2)} settled successfully!`;
      setSuccess(msg);
      showAlert.success("Payment Recorded Successfully!", msg);
      setPayModalOpen(false);
      loadSupplierData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      showAlert.error("Payment Failed", err.message || "Payment recording failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading && !supplier) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <p className="text-xs font-bold">Loading supplier profile & purchase history...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Supplier Not Found</h3>
        <p className="text-xs text-slate-500">{error || "The requested supplier could not be loaded."}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
        >
          Return to Suppliers
        </button>
      </div>
    );
  }  const stats = supplier.periodStats || supplier.stats || {
    totalPurchased: Number(supplier.totalPurchased || 0),
    totalPaid: Number(supplier.totalPaid || 0),
    totalDue: Number(supplier.totalDue || 0),
    purchasesCount: supplier.purchases?.length || 0,
    paymentsCount: supplier.payments?.length || 0,
    lifetimeTotalPurchased: Number(supplier.totalPurchased || 0),
    lifetimeTotalPaid: Number(supplier.totalPaid || 0),
    lifetimeTotalDue: Number(supplier.totalDue || 0),
    isFiltered: false,
  };

  const periodPurchased = Number(stats.totalPurchased || 0);
  const periodPaid = Number(stats.totalPaid || 0);
  const periodDue = Number(stats.totalDue || 0);
  const lifetimePurchased = Number(stats.lifetimeTotalPurchased ?? supplier.totalPurchased ?? 0);
  const lifetimePaid = Number(stats.lifetimeTotalPaid ?? supplier.totalPaid ?? 0);
  const lifetimeDue = Number(stats.lifetimeTotalDue ?? supplier.totalDue ?? 0);
  const contacts = supplier.contacts || [];
  const purchases = supplier.purchases || [];

  const supplierDisplayName =
    supplier.name && supplier.name.trim().length > 2
      ? supplier.name
      : supplier.company && supplier.company.trim().length > 2
        ? supplier.company
        : supplier.name || supplier.company || "Supplier";

  const totalPurchaseCount = purchases.length;
  const totalPurchasePages = Math.max(1, Math.ceil(totalPurchaseCount / purchasePageSize));
  const purchaseStartItem = totalPurchaseCount === 0 ? 0 : (purchasePage - 1) * purchasePageSize + 1;
  const purchaseEndItem = Math.min(purchasePage * purchasePageSize, totalPurchaseCount);
  const paginatedPurchases = purchases.slice(
    (purchasePage - 1) * purchasePageSize,
    purchasePage * purchasePageSize
  );

  const getPresetLabel = () => {
    switch (datePreset) {
      case "TODAY":
        return "Today";
      case "YESTERDAY":
        return "Yesterday";
      case "THIS_MONTH":
        return "This Month";
      case "THIS_YEAR":
        return "This Year";
      case "CUSTOM":
        return customStartDate && customEndDate
          ? `${customStartDate} to ${customEndDate}`
          : "Custom Date";
      case "ALL":
      default:
        return "All Time";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 font-bold transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Suppliers</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1 (TOP HERO): COMPANY INFORMATION & SALES REPRESENTATIVES (SRs)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Company Profile Card (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Company Information
              </span>
              <button
                onClick={handleOpenEditProfile}
                className="text-xs sm:text-sm font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="flex items-center gap-3.5 pt-3.5">
              <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-xl shrink-0">
                {supplierDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight break-words">
                  {supplierDisplayName}
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  ID: #{supplier.id.slice(0, 8)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                {supplier.phone ? (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-brand-primary transition"
                  >
                    {supplier.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                {supplier.email ? (
                  <a
                    href={`mailto:${supplier.email}`}
                    className="hover:text-brand-primary truncate"
                  >
                    {supplier.email}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">
                  {supplier.address || "No depot/office address"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Persons & Representatives (Right 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-primary" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Sales Representatives & SRs
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                {contacts.length}
              </span>
            </div>

            <button
              onClick={handleOpenAddContact}
              className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Representative</span>
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <User className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                No representatives registered yet
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Add Sales Representatives (SR) or Territory Officers to easily contact them for batch orders.
              </p>
              <button
                onClick={handleOpenAddContact}
                className="mt-1 px-3 py-1 bg-brand-primary text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                Add SR Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-2xl border transition relative space-y-2 ${
                    c.isActive
                      ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      : "bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] sm:text-xs text-brand-primary font-semibold truncate">
                          {c.designation || "Representative (SR)"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleOpenEditContact(c)}
                        className="p-1 text-slate-400 hover:text-brand-primary rounded transition cursor-pointer"
                        title="Edit Contact"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleContactStatus(c)}
                        className={`p-1 rounded transition cursor-pointer ${
                          c.isActive ? "text-slate-400 hover:text-rose-500" : "text-slate-400 hover:text-emerald-500"
                        }`}
                        title={c.isActive ? "Deactivate Contact" : "Activate Contact"}
                      >
                        {c.isActive ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 text-xs sm:text-sm space-y-1">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                      <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <a href={`tel:${c.phone}`} className="hover:underline">
                        {c.phone}
                      </a>
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 (MIDDLE): DATE RANGE & DYNAMIC FINANCIAL PERFORMANCE            */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-primary" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Filter Financials by Date:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold">
              {getPresetLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "CUSTOM", label: "Custom Date" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setDatePreset(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  datePreset === t.id
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {datePreset === "CUSTOM" && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
              />
            </div>
            <button
              onClick={loadSupplierData}
              disabled={!customStartDate || !customEndDate}
              className="px-4 py-1.5 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Financial KPI State Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Purchased */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Purchased
            </div>
            <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              ৳{periodPurchased.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500">
              <span>{stats.purchasesCount || purchases.length} order(s) placed</span>
              <span className="font-bold text-brand-primary">({getPresetLabel()})</span>
            </div>
          </div>
          {datePreset !== "ALL" && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Lifetime: ৳{lifetimePurchased.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        {/* Card 2: Total Settled / Paid */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Settled / Paid
            </div>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ৳{periodPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 text-emerald-700 dark:text-emerald-300">
              <span>{stats.paymentsCount || (supplier.payments?.length || 0)} payment(s)</span>
              <span className="font-bold">({getPresetLabel()})</span>
            </div>
          </div>
          {datePreset !== "ALL" && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Lifetime Paid: ৳{lifetimePaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>

        {/* Card 3: Period Due */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Period Due
            </div>
            <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              ৳{periodDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] mt-1 text-slate-500">
              Invoices in ({getPresetLabel()})
            </div>
          </div>
          {datePreset !== "ALL" && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-amber-600/80 font-bold">
              Period Unsettled
            </div>
          )}
        </div>

        {/* Card 4: Total Outstanding Due (Lifetime) */}
        <div className={`p-5 bg-white dark:bg-slate-900 rounded-3xl border shadow-sm flex flex-col justify-between transition hover:shadow-md ${
          lifetimeDue > 0
            ? "border-rose-200 dark:border-rose-950 bg-rose-50/10"
            : "border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
              Total Outstanding Due
            </div>
            <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              ৳{lifetimeDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] mt-1 text-rose-500 font-semibold">
              {lifetimeDue > 0 ? "Total payable balance pending" : "All payments cleared"}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Net Payable</span>
            {lifetimeDue > 0 && (
              <button
                onClick={handleOpenPayModal}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Settle Due &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 (BOTTOM): INWARD PURCHASE ORDERS & INVOICE HISTORY               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Receipt className="h-5 w-5 text-brand-primary" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Purchase & Inward Order History</h2>
              <p className="text-xs sm:text-sm text-slate-400">Medicine intake orders received from {supplierDisplayName}.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-bold">
            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              Orders for: <strong className="text-brand-primary font-black">{getPresetLabel()}</strong> ({purchases.length} invoices)
            </span>
          </div>
        </div>

        {/* Purchases Table */}
        {purchases.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">No purchase records found for this period</p>
            <p className="text-xs mt-0.5">Purchases recorded during Stock Intake will automatically appear here.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="table-responsive-container">
              <table className="w-full min-w-[750px] text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4">Branch</th>
                    <th className="py-4 px-4">Contact Person</th>
                    <th className="py-4 px-4 text-right">Total Amount</th>
                    <th className="py-4 px-4 text-right">Paid</th>
                    <th className="py-4 px-4 text-right">Due</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  {paginatedPurchases.map((p: any) => {
                    const pTotal = Number(p.totalAmount || 0);
                    const pPaid = Number(p.paidAmount || 0);
                    const pDue = Number(p.dueAmount || 0);

                    const repName =
                      p.contactPerson?.name ||
                      p.contactPersonName ||
                      supplier.contactPerson ||
                      "—";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-4 px-4 font-mono font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          {new Date(p.purchaseDate || p.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                          {p.branch?.name || "Main Branch"}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{repName}</span>
                          </div>
                          {p.contactPerson?.phone && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              {p.contactPerson.phone}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right font-black font-mono text-sm sm:text-base text-slate-900 dark:text-white">
                          ৳{pTotal.toFixed(2)}
                        </td>

                        <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm sm:text-base">
                          ৳{pPaid.toFixed(2)}
                        </td>

                        <td className="py-4 px-4 text-right font-mono">
                          {pDue > 0 ? (
                            <span className="text-rose-600 font-black text-sm sm:text-base">৳{pDue.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400 text-xs sm:text-sm">৳0.00</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              p.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900"
                                : p.paymentStatus === "PARTIAL"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(p)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Clean Pagination Footer for Purchase History */}
            {totalPurchaseCount > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                {/* Record Status */}
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  Showing <strong className="text-slate-900 dark:text-white font-bold">{purchaseStartItem}</strong> to{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{purchaseEndItem}</strong> of{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{totalPurchaseCount}</strong> invoices
                </div>

                {/* Controls: Rows per page & Page navigation */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span>Rows per page:</span>
                    <select
                      value={purchasePageSize}
                      onChange={(e) => {
                        setPurchasePageSize(Number(e.target.value));
                        setPurchasePage(1);
                      }}
                      className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Page Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPurchasePage(1)}
                      disabled={purchasePage <= 1}
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurchasePage((p) => Math.max(1, p - 1))}
                      disabled={purchasePage <= 1}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="text-slate-900 dark:text-white font-black">{purchasePage}</span> / {totalPurchasePages}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPurchasePage((p) => Math.min(totalPurchasePages, p + 1))}
                      disabled={purchasePage >= totalPurchasePages}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurchasePage(totalPurchasePages)}
                      disabled={purchasePage >= totalPurchasePages}
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD / EDIT CONTACT MODAL */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-brand-primary" />
                {editingContact ? "Edit Contact Person" : "Add Contact Person"}
              </h3>
              <button onClick={() => setContactModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Representative Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Rafiqul Islam"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01712345678"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Representative (SR), Area Manager"
                  value={contactForm.designation}
                  onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. rafiq@company.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContact || !contactForm.name || !contactForm.phone}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingContact ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUPPLIER PROFILE MODAL */}
      {editProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="h-5 w-5 text-brand-primary" />
                Edit Company Profile
              </h3>
              <button onClick={() => setEditProfileModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  General Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Depot / Office Address
                </label>
                <textarea
                  rows={2}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !profileForm.name}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE DUE PAYMENT MODAL */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-rose-600" />
                Settle Supplier Due Balance
              </h3>
              <button onClick={() => setPayModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Current Due:</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                  ৳{lifetimeDue.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (৳) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  max={lifetimeDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paying Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {financialAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) [Balance: ৳{Number(acc.balance).toFixed(2)}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Note / Reference Voucher
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank Voucher #12345 or Cash receipt"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying || payAmount <= 0 || financialAccounts.length === 0 || !selectedAccountId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {paying ? "Settling..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE DETAILS MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-primary" />
                Purchase Invoice #{selectedInvoice.invoiceNo}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Date: </span>
                <span className="font-bold font-mono text-slate-800 dark:text-white">
                  {new Date(selectedInvoice.purchaseDate || selectedInvoice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Branch: </span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedInvoice.branch?.name || "Main Branch"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Contact Person: </span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedInvoice.contactPerson?.name || selectedInvoice.contactPersonName || supplier.contactPerson || "—"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Payment Status: </span>
                <span className="font-bold text-brand-primary">{selectedInvoice.paymentStatus}</span>
              </div>
            </div>

            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div className="table-responsive-container border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedInvoice.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {item.product?.name || "Product"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {item.batchNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ৳{Number(item.unitPurchasePrice).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          ৳{Number(item.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between text-xs font-bold">
              <div>
                Total: <span className="font-mono">৳{Number(selectedInvoice.totalAmount).toFixed(2)}</span> • Paid:{" "}
                <span className="font-mono text-emerald-600">৳{Number(selectedInvoice.paidAmount).toFixed(2)}</span>
              </div>
              <div className="text-rose-600 font-mono">
                Due: ৳{Number(selectedInvoice.dueAmount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
