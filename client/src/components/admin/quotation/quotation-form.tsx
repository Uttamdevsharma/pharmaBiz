"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  Printer,
  Eye,
  RefreshCw,
  HardDrive,
  Cpu,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
import { numberToWords } from "@/lib/number-to-words";
import {
  DEFAULT_SOFTWARE_COLUMNS,
  DEFAULT_HARDWARE_COLUMNS,
  DEFAULT_SOFTWARE_ROWS,
  DEFAULT_HARDWARE_ROWS,
  DEFAULT_UNIFIED_TERMS_AND_CONDITIONS,
  SoftwareRow,
  HardwareRow,
  QuotationColumn,
} from "./quotation-defaults";
import { QuotationRichEditor } from "./quotation-rich-editor";
import { QuotationPrintSheet } from "./quotation-print-sheet";

interface QuotationFormProps {
  quotationId?: number | null;
  initialData?: any;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QuotationForm({
  quotationId,
  initialData,
  isEdit = false,
  onSuccess,
  onCancel,
}: QuotationFormProps) {
  const [loadingInitial, setLoadingInitial] = useState<boolean>(Boolean(quotationId && !initialData));

  // Basic Details
  const [refNo, setRefNo] = useState(initialData?.ref_no || "");
  const [quoteDate, setQuoteDate] = useState(
    initialData?.quote_date
      ? new Date(initialData.quote_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [clientName, setClientName] = useState(initialData?.client_name || "");
  const [organizationName, setOrganizationName] = useState(initialData?.organization_name || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [subject, setSubject] = useState(
    initialData?.subject || "Quotation for PharmaBiz Pharmacy Management & Smart POS System"
  );

  // Software Table & SaaS
  const [softwareColumns, setSoftwareColumns] = useState<QuotationColumn[]>(
    initialData?.software_columns || DEFAULT_SOFTWARE_COLUMNS
  );
  const [softwareRows, setSoftwareRows] = useState<SoftwareRow[]>(
    initialData?.software_rows || DEFAULT_SOFTWARE_ROWS
  );
  const [planName, setPlanName] = useState<string>(
    initialData?.plan_name || "Pharmacy Starter"
  );
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  const [billingCycle, setBillingCycle] = useState<string>(
    initialData?.billing_cycle || "MONTHLY"
  );
  const [licenseFeeTitle, setLicenseFeeTitle] = useState<string>(
    initialData?.license_fee_title || "One-time Setup & Onboarding Fee"
  );
  const [licenseFeeAmount, setLicenseFeeAmount] = useState<number>(
    initialData?.license_fee_amount !== undefined ? Number(initialData.license_fee_amount) : 5000
  );
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(
    initialData?.subscription_amount !== undefined ? Number(initialData.subscription_amount) : 1500
  );
  const [recurringNote, setRecurringNote] = useState<string>(
    initialData?.recurring_note || "From 2nd month onwards: ৳ 1,500 / month regular subscription fee."
  );

  // Initial Software Investment (Setup Fee + 1st Cycle Subscription)
  const initialSoftwareTotal = (Number(licenseFeeAmount) || 0) + (Number(subscriptionAmount) || 0);

  // Hardware Table
  const [hasHardware, setHasHardware] = useState<boolean>(
    initialData?.has_hardware !== undefined ? Boolean(initialData.has_hardware) : false
  );
  const [hardwareColumns, setHardwareColumns] = useState<QuotationColumn[]>(
    initialData?.hardware_columns || DEFAULT_HARDWARE_COLUMNS
  );
  const [hardwareRows, setHardwareRows] = useState<HardwareRow[]>(
    initialData?.hardware_rows || DEFAULT_HARDWARE_ROWS
  );

  // Unified Rich Terms Content
  const [termsContent, setTermsContent] = useState<string>(() => {
    if (initialData?.terms_conditions) {
      return initialData.terms_conditions;
    }
    return DEFAULT_UNIFIED_TERMS_AND_CONDITIONS;
  });

  // Signatory
  const [signatoryName, setSignatoryName] = useState(
    initialData?.company_signatory_name || "Md. Sorower Jahan"
  );
  const [signatoryTitle, setSignatoryTitle] = useState(
    initialData?.company_signatory_title || "CEO, PharmaBiz / okobiz"
  );
  const [signatoryPhone, setSignatoryPhone] = useState(
    initialData?.company_phone || "+880 1973590937"
  );

  // Status & Email
  const [status, setStatus] = useState<string>(initialData?.status || "SENT");
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Load quotation data if editing by quotationId
  useEffect(() => {
    if (quotationId && !initialData) {
      setLoadingInitial(true);
      fetch(`/api/super-admin/quotations/${quotationId}`, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success && resData.data) {
            const d = resData.data;
            setRefNo(d.ref_no || "");
            if (d.quote_date) {
              setQuoteDate(new Date(d.quote_date).toISOString().split("T")[0]);
            }
            setClientName(d.client_name || "");
            setOrganizationName(d.organization_name || "");
            setAddress(d.address || "");
            setPhone(d.phone || "");
            setEmail(d.email || "");
            setSubject(d.subject || "");
            if (d.software_columns) setSoftwareColumns(d.software_columns);
            if (d.software_rows) setSoftwareRows(d.software_rows);
            if (d.plan_name) setPlanName(d.plan_name);
            if (d.billing_cycle) setBillingCycle(d.billing_cycle);
            if (d.license_fee_title) setLicenseFeeTitle(d.license_fee_title);
            if (d.license_fee_amount !== undefined) setLicenseFeeAmount(Number(d.license_fee_amount));
            if (d.subscription_amount !== undefined) setSubscriptionAmount(Number(d.subscription_amount));
            if (d.recurring_note) setRecurringNote(d.recurring_note);
            setHasHardware(Boolean(d.has_hardware));
            if (d.hardware_columns) setHardwareColumns(d.hardware_columns);
            if (d.hardware_rows) setHardwareRows(d.hardware_rows);
            if (d.terms_conditions) setTermsContent(d.terms_conditions);
            if (d.company_signatory_name) setSignatoryName(d.company_signatory_name);
            if (d.company_signatory_title) setSignatoryTitle(d.company_signatory_title);
            if (d.company_phone) setSignatoryPhone(d.company_phone);
            if (d.status) setStatus(d.status);
          }
        })
        .catch(() => {
          Swal.fire("Error", "Failed to load quotation details", "error");
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [quotationId, initialData]);

  // Fetch next Ref No if creating new
  useEffect(() => {
    if (!isEdit && !quotationId && !refNo) {
      fetch("/api/super-admin/quotations", {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.nextRefNo) {
            setRefNo(data.nextRefNo);
          }
        })
        .catch(() => {});
    }
  }, [isEdit, quotationId, refNo]);

  // Fetch available subscription plans
  useEffect(() => {
    fetch("/api/super-admin/plans", {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAvailablePlans(data.data.filter((p: any) => p.is_active));
        }
      })
      .catch(() => {});
  }, []);


  // Handlers for Plan and Cycle change with auto-fill
  const handlePlanChange = (newPlan: string) => {
    setPlanName(newPlan);
    const matched = availablePlans.find((p) => p.name === newPlan);
    if (matched) {
      if (billingCycle === "YEARLY") {
        const annual = Number(matched.price_annual) || Number(matched.price_monthly) * 12;
        setSubscriptionAmount(annual);
        setRecurringNote(`From 2nd year onwards: ৳ ${annual.toLocaleString("en-BD")} / year subscription fee.`);
      } else if (billingCycle === "ONE_TIME") {
        setSubscriptionAmount(0);
        setRecurringNote("Lifetime software license. No recurring subscription fee.");
      } else {
        const monthly = Number(matched.price_monthly) || 0;
        setSubscriptionAmount(monthly);
        setRecurringNote(`From 2nd month onwards: ৳ ${monthly.toLocaleString("en-BD")} / month subscription fee.`);
      }
    }
  };

  const handleBillingCycleChange = (newCycle: string) => {
    setBillingCycle(newCycle);
    const matched = availablePlans.find((p) => p.name === planName);
    if (matched) {
      if (newCycle === "YEARLY") {
        const annual = Number(matched.price_annual) || Number(matched.price_monthly) * 12;
        setSubscriptionAmount(annual);
        setRecurringNote(`From 2nd year onwards: ৳ ${annual.toLocaleString("en-BD")} / year subscription fee.`);
      } else if (newCycle === "ONE_TIME") {
        setSubscriptionAmount(0);
        setRecurringNote("Lifetime software license. No recurring subscription fee.");
      } else {
        const monthly = Number(matched.price_monthly) || 0;
        setSubscriptionAmount(monthly);
        setRecurringNote(`From 2nd month onwards: ৳ ${monthly.toLocaleString("en-BD")} / month subscription fee.`);
      }
    } else {
      if (newCycle === "YEARLY") {
        setRecurringNote(`From 2nd year onwards: ৳ ${subscriptionAmount.toLocaleString("en-BD")} / year subscription fee.`);
      } else if (newCycle === "ONE_TIME") {
        setRecurringNote("Lifetime software license. No recurring subscription fee.");
      } else {
        setRecurringNote(`From 2nd month onwards: ৳ ${subscriptionAmount.toLocaleString("en-BD")} / month subscription fee.`);
      }
    }
  };

  // Hardware Total Calculation
  const hardwareTotal = hasHardware
    ? hardwareRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0)
    : 0;

  // Grand Total Calculation
  const grandTotal = initialSoftwareTotal + hardwareTotal;
  const inWords = numberToWords(grandTotal);

  // Software Row actions
  const handleAddSoftwareRow = () => {
    setSoftwareRows((prev) => [
      ...prev,
      {
        sl: prev.length + 1,
        scope: "",
        particulars: "",
      },
    ]);
  };

  const handleRemoveSoftwareRow = (index: number) => {
    setSoftwareRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSoftwareRow = (
    index: number,
    field: keyof SoftwareRow,
    value: any
  ) => {
    setSoftwareRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Hardware Row actions
  const handleAddHardwareRow = () => {
    setHardwareRows((prev) => [
      ...prev,
      {
        sl: prev.length + 1,
        product: "",
        specifications: "",
        amount: 0,
      },
    ]);
  };

  const handleRemoveHardwareRow = (index: number) => {
    setHardwareRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateHardwareRow = (
    index: number,
    field: keyof HardwareRow,
    value: any
  ) => {
    setHardwareRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Current compiled data for Preview
  const currentQuotationData = {
    id: quotationId || initialData?.id,
    ref_no: refNo,
    quote_date: quoteDate,
    client_name: clientName,
    organization_name: organizationName,
    address,
    phone,
    email,
    subject,
    software_columns: softwareColumns,
    software_rows: softwareRows,
    software_amount: initialSoftwareTotal,
    plan_name: planName,
    billing_cycle: billingCycle,
    license_fee_title: licenseFeeTitle,
    license_fee_amount: licenseFeeAmount,
    subscription_amount: subscriptionAmount,
    recurring_note: recurringNote,
    has_hardware: hasHardware,
    hardware_columns: hardwareColumns,
    hardware_rows: hardwareRows,
    hardware_amount: hardwareTotal,
    grand_total: grandTotal,
    in_words: inWords,
    terms_conditions: termsContent,
    company_signatory_name: signatoryName,
    company_signatory_title: signatoryTitle,
    company_phone: signatoryPhone,
    status,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      Swal.fire("Missing Information", "Please enter the Client Name.", "warning");
      return;
    }
    if (!refNo.trim()) {
      Swal.fire("Missing Information", "Please enter a Quotation Reference Number.", "warning");
      return;
    }
    if (sendEmail && !email.trim()) {
      Swal.fire(
        "Missing Client Email",
        "Please enter Client Email to automatically dispatch the quotation, or uncheck the email option.",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...currentQuotationData,
        send_email: sendEmail,
      };

      const targetId = quotationId || initialData?.id;
      const isUpdating = Boolean(isEdit || targetId);
      const url = isUpdating
        ? `/api/super-admin/quotations/${targetId}`
        : "/api/super-admin/quotations";
      const method = isUpdating ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to save quotation");
      }

      if (result.emailSent) {
        await Swal.fire(
          "Success!",
          `Quotation saved and dispatched to ${email}!`,
          "success"
        );
      } else if (result.emailError) {
        await Swal.fire(
          "Saved with Warning",
          `Quotation saved, but email could not be sent: ${result.emailError}`,
          "warning"
        );
      } else {
        await Swal.fire("Saved!", "Quotation created successfully.", "success");
      }

      onSuccess?.();
    } catch (err: any) {
      Swal.fire("Error", err.message || "An unexpected error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
        Loading quotation details...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              {isEdit || quotationId ? `Edit Quotation (${refNo})` : "Create New Quotation"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize software features, plan tier, POS equipment and corporate terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-teal-600" /> Live Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? "Processing..." : isEdit || quotationId ? "Update Quotation" : "Generate Quotation"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CLIENT & QUOTATION DETAILS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-xs font-black">
                1
              </span>
              Client &amp; Quotation Identification
            </h3>
            <span className="text-[11px] font-mono text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded font-bold">
              Ref: {refNo || "Generating..."}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Quotation Ref No. *
              </label>
              <input
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                placeholder="pharmabiz/001/..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Date of Issuance *
              </label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Quotation Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
              >
                <option value="SENT">Sent</option>
                <option value="DRAFT">Draft</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Client / Contact Person Name *
              </label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="e.g. Dr. Mahbubur Rahman"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Pharmacy / Organization Name
              </label>
              <input
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Popular Pharma Care Ltd."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Contact Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 17XXXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Client Email (For Auto PDF Dispatch)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Premises / Pharmacy Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House #12, Road #4, Dhanmondi, Dhaka - 1205"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Quotation Subject Line *
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Subject..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* SECTION 2: SOFTWARE MODULES & SCOPE OF WORK */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-xs font-black">
                2
              </span>
              Software Scope of Work &amp; Functional Modules
            </h3>
            <button
              type="button"
              onClick={handleAddSoftwareRow}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Module
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">SL</th>
                  <th className="py-2.5 px-3 w-1/3 text-left">Module / Scope</th>
                  <th className="py-2.5 px-3 text-left">Technical Particulars &amp; Features</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {softwareRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={row.scope}
                        onChange={(e) => handleUpdateSoftwareRow(idx, "scope", e.target.value)}
                        placeholder="Module name..."
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold bg-white dark:bg-slate-950"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <textarea
                        value={row.particulars}
                        onChange={(e) => handleUpdateSoftwareRow(idx, "particulars", e.target.value)}
                        rows={2}
                        placeholder="Key features..."
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSoftwareRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: COMMERCIAL SUBSCRIPTION & ONBOARDING FEES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-xs font-black">
                3
              </span>
              Software Licensing &amp; Subscription Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Plan Tier Selection
              </label>
              <select
                value={planName}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
              >
                {availablePlans.length > 0 ? (
                  availablePlans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.tier}) &mdash; ৳{Number(p.price_monthly).toLocaleString("en-BD")}/mo
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Pharmacy Starter">Pharmacy Starter</option>
                    <option value="Pharmacy Growth">Pharmacy Growth</option>
                    <option value="Pharmacy Enterprise">Pharmacy Enterprise</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Billing Cycle
              </label>
              <select
                value={billingCycle}
                onChange={(e) => handleBillingCycleChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
              >
                <option value="MONTHLY">Monthly Billing</option>
                <option value="YEARLY">Yearly Billing (Discounted)</option>
                <option value="ONE_TIME">Lifetime License (One-Time)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Setup / License Fee Title
              </label>
              <input
                value={licenseFeeTitle}
                onChange={(e) => setLicenseFeeTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                One-Time Setup &amp; Onboarding Fee (BDT)
              </label>
              <input
                type="number"
                value={licenseFeeAmount}
                onChange={(e) => setLicenseFeeAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Initial Subscription Advance Amount (BDT)
              </label>
              <input
                type="number"
                value={subscriptionAmount}
                onChange={(e) => setSubscriptionAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Recurring Subscription Note
            </label>
            <input
              value={recurringNote}
              onChange={(e) => setRecurringNote(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          {/* Subtotal preview */}
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex justify-between items-center text-xs">
            <span className="font-bold text-teal-900 dark:text-teal-200">
              Total Software Onboarding Payable:
            </span>
            <span className="font-mono font-black text-sm text-teal-700 dark:text-teal-400">
              ৳ {initialSoftwareTotal.toLocaleString("en-BD")}
            </span>
          </div>
        </div>

        {/* SECTION 4: POS HARDWARE EQUIPMENT (OPTIONAL CHECKBOX) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasHardware}
                onChange={(e) => setHasHardware(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded cursor-pointer"
              />
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-teal-600" />
                Include POS Hardware Package &amp; Equipment
              </span>
            </label>

            {hasHardware && (
              <button
                type="button"
                onClick={handleAddHardwareRow}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Equipment
              </button>
            )}
          </div>

          {hasHardware && (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">SL</th>
                      <th className="py-2.5 px-3 w-1/4 text-left">Equipment / Item</th>
                      <th className="py-2.5 px-3 text-left">Specifications</th>
                      <th className="py-2.5 px-3 w-32 text-right">Amount (BDT)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {hardwareRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={row.product}
                            onChange={(e) => handleUpdateHardwareRow(idx, "product", e.target.value)}
                            placeholder="Item name..."
                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={row.specifications}
                            onChange={(e) => handleUpdateHardwareRow(idx, "specifications", e.target.value)}
                            placeholder="Specifications..."
                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => handleUpdateHardwareRow(idx, "amount", Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-right bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveHardwareRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Total Hardware Package:
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  ৳ {hardwareTotal.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: GRAND TOTAL SUMMARY CARD */}
        <div className="bg-teal-900 text-white rounded-2xl p-6 space-y-3 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <p className="text-teal-200 text-xs font-bold uppercase tracking-wider">
                Financial Summary &amp; Grand Total
              </p>
              <h2 className="text-3xl font-black mt-1">
                ৳ {grandTotal.toLocaleString("en-BD")}
              </h2>
            </div>
            <div className="text-right text-xs space-y-1">
              <p className="text-teal-100">
                Software Investment: <strong className="font-mono font-bold">৳ {initialSoftwareTotal.toLocaleString("en-BD")}</strong>
              </p>
              {hasHardware && (
                <p className="text-teal-100">
                  Hardware Equipment: <strong className="font-mono font-bold">৳ {hardwareTotal.toLocaleString("en-BD")}</strong>
                </p>
              )}
            </div>
          </div>
          <div className="border-t border-teal-700/60 pt-3 text-xs text-teal-100 italic">
            <strong>In Words:</strong> {inWords}
          </div>
        </div>

        {/* SECTION 6: TERMS, TIMELINE & CONDITIONS (RICH TEXT EDITOR) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-xs font-black">
                6
              </span>
              Terms, Timeline &amp; Technical Conditions
            </h3>
            <button
              type="button"
              onClick={() => setTermsContent(DEFAULT_UNIFIED_TERMS_AND_CONDITIONS)}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset to Official Template
            </button>
          </div>

          <QuotationRichEditor
            value={termsContent}
            onChange={setTermsContent}
          />
        </div>

        {/* SECTION 7: COMPANY SIGNATORY & EMAIL NOTIFICATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-xs font-black">
                7
              </span>
              Company Signatory &amp; Client Email Transmission
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Authorized Signatory Name
              </label>
              <input
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Md. Sorower Jahan"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Designation &amp; Organization
              </label>
              <input
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="CEO, PharmaBiz / okobiz"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Contact Phone
              </label>
              <input
                value={signatoryPhone}
                onChange={(e) => setSignatoryPhone(e.target.value)}
                placeholder="+880 1973590937"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-start gap-3 mt-3">
            <input
              type="checkbox"
              id="send_email_check"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-teal-600 rounded cursor-pointer"
            />
            <label htmlFor="send_email_check" className="cursor-pointer">
              <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                Send official branded Quotation directly to client's email upon submission
              </span>
              <span className="text-[11px] text-teal-800/80 dark:text-teal-400 block mt-0.5">
                When enabled, an automated email with quotation summary and printable link will be dispatched to{" "}
                <strong>{email || "(Client email entered above)"}</strong>.
              </span>
            </label>
          </div>
        </div>

        {/* BOTTOM SUBMISSION BUTTONS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-teal-600" /> Live Document Preview
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? "Processing..." : isEdit || quotationId ? "Update Quotation" : "Submit & Generate Quotation"}
          </button>
        </div>
      </form>

      {/* LIVE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Document Preview ({refNo || "Draft"})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-teal-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-200 dark:bg-zinc-950">
              <QuotationPrintSheet data={currentQuotationData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
