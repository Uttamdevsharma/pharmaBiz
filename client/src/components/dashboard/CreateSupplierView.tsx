"use client";

import React, { useState } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import {
  Building,
  Plus,
  Trash2,
  Phone,
  Mail,
  User,
  MapPin,
  Briefcase,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Truck,
} from "lucide-react";

interface ContactRow {
  name: string;
  phone: string;
  email: string;
  designation: string;
}

interface CreateSupplierViewProps {
  onNavigate: (module: any, extra?: any) => void;
  onSupplierCreated?: (supplierId: string) => void;
}

export function CreateSupplierView({ onNavigate, onSupplierCreated }: CreateSupplierViewProps) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [contacts, setContacts] = useState<ContactRow[]>([
    { name: "", phone: "", email: "", designation: "Sales Representative (SR)" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      { name: "", phone: "", email: "", designation: "Sales Representative (SR)" },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof ContactRow, value: string) => {
    setContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the supplier / pharmaceutical company name.");
      return;
    }

    // Filter valid contacts
    const validContacts = contacts
      .map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        email: c.email.trim() || null,
        designation: c.designation.trim() || null,
      }))
      .filter((c) => c.name && c.phone);

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: name.trim(),
        company: company.trim() || name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || (validContacts[0]?.phone || "—"),
        email: email.trim() || null,
        contactPerson: validContacts[0]?.name || null,
        contacts: validContacts,
      };

      const res = await fetchApi<any>("/suppliers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create supplier");
      }

      const successText = `Supplier "${name}" registered successfully!`;
      setSuccess(successText);
      await showAlert.success("Supplier Registered Successfully!", successText, { timer: 1800 });
      const newSupplierId = res.data?.id;

      if (onSupplierCreated && newSupplierId) {
        onSupplierCreated(newSupplierId);
      } else if (newSupplierId) {
        onNavigate("sup_suppliers", { supplierId: newSupplierId });
      } else {
        onNavigate("sup_suppliers");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to save supplier";
      setError(msg);
      showAlert.error("Registration Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            type="button"
            onClick={() => onNavigate("sup_suppliers")}
            className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 mb-2 font-bold transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Suppliers
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building className="h-7 w-7 text-brand-primary" />
            Register Supplier
          </h1>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-bold animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Profile */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Truck className="h-5 w-5 text-brand-primary" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">1. Company Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Supplier Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Square Pharmaceuticals Ltd"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!company) setCompany(e.target.value);
                }}
                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 01711000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. orders@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <textarea
                  rows={2}
                  placeholder="e.g. Tejgaon Industrial Area, Dhaka"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Persons */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <User className="h-5 w-5 text-brand-primary" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white">2. Contact Persons</h2>
            </div>

            <button
              type="button"
              onClick={handleAddContact}
              className="h-11 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-primary rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Contact Person
            </button>
          </div>

          <div className="space-y-4">
            {contacts.map((contact, idx) => (
              <div
                key={idx}
                className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Contact Person #{idx + 1}
                  </span>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition cursor-pointer"
                      title="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Representative Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Md. Rafiqul Islam"
                        value={contact.name}
                        onChange={(e) => handleContactChange(idx, "name", e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. 01712345678"
                        value={contact.phone}
                        onChange={(e) => handleContactChange(idx, "phone", e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. SR / Sales Rep"
                        value={contact.designation}
                        onChange={(e) => handleContactChange(idx, "designation", e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="e.g. rafiq@gmail.com"
                        value={contact.email}
                        onChange={(e) => handleContactChange(idx, "email", e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate("sup_suppliers")}
            className="h-12 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="h-12 px-7 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registering Supplier...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Save Supplier & Contacts
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
