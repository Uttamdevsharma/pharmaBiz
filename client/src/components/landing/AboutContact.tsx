"use client";

import React, { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";

export function AboutContact() {
  const { settings } = useSettings();
  const contact = settings.contact || {};
  const about = settings.about || {};

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", message: "" });
    }, 4000);
  };

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        {/* About Section Highlights */}
        <div className="text-center max-w-3xl 2xl:max-w-4xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider brand-subtle-bg text-brand-primary border brand-subtle-border">
            About PharmaBiz
          </div>
          <h2 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {about.headline || "Built for Modern Pharmacy Enterprises"}
          </h2>
          <p className="text-base sm:text-lg 2xl:text-xl text-slate-600 dark:text-slate-400">
            {about.description ||
              "PharmaBiz provides a complete operating system for retail pharmacies and hospital chains, offering bulletproof reliability and multi-tenant data isolation."}
          </p>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 2xl:gap-8 mb-20">
          {(about.stats || [
            { label: "Uptime Guaranteed", value: "99.99%" },
            { label: "Offline Resilience", value: "72+ Hours" },
            { label: "POS Transaction Speed", value: "< 1 Sec" },
            { label: "Pharmacies Powered", value: "500+" },
          ]).map((stat, idx) => (
            <div
              key={idx}
              className="p-6 2xl:p-8 rounded-2xl 2xl:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 shadow-sm"
            >
              <div className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-brand-primary">{stat.value}</div>
              <div className="text-xs sm:text-sm 2xl:text-base font-medium text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div id="contact" className="grid grid-cols-1 lg:grid-cols-12 gap-10 2xl:gap-16 pt-8">
          {/* Contact Details */}
          <div className="lg:col-span-5 2xl:col-span-5 space-y-8">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Get in Touch With Our Healthcare Solutions Team
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
                Have questions about branch migration, custom hardware setup, or enterprise compliance? Reach out anytime.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="h-10 w-10 rounded-lg brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Email Us</div>
                  <a href={`mailto:${contact.email || "shameem.rml@gmail.com"}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-primary">
                    {contact.email || "shameem.rml@gmail.com"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="h-10 w-10 rounded-lg brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Call Support</div>
                  <a href={`tel:${contact.phone || "01973590937"}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-primary">
                    {contact.phone || "01973590937"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="h-10 w-10 rounded-lg brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">HQ Office</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {contact.address || "Gulshan-2, Dhaka-1212, Bangladesh"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="h-10 w-10 rounded-lg brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">Support Hours</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {contact.supportHours || "24/7 Dedicated Support"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Message Form */}
          <div className="lg:col-span-7 2xl:col-span-7 p-8 2xl:p-10 rounded-2xl 2xl:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
            <h4 className="text-xl 2xl:text-2xl font-bold text-slate-900 dark:text-white mb-2">Send Us a Direct Message</h4>
            <p className="text-xs text-slate-500 mb-6">Our enterprise onboarding specialist will respond within 2 hours.</p>

            {submitted ? (
              <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <h5 className="text-base font-bold text-emerald-700 dark:text-emerald-400">Message Received!</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400">Thank you for reaching out. A platform representative will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name / Pharmacy Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Acme Pharmacy Ltd."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@pharmacy.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message / Inquiry Details
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your branch scale and requirements..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-bold shadow hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
