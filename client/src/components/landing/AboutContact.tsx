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
    <section id="about" className="py-20 relative overflow-hidden">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {about.headline || "About PharmaBiz"}
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {(about.stats || [
            { label: "Uptime Guaranteed", value: "99.99%" },
            { label: "Offline Resilience", value: "72+ Hours" },
            { label: "POS Transaction Speed", value: "< 1 Sec" },
            { label: "Pharmacies Powered", value: "500+" },
          ]).map((stat, idx) => (
            <div
              key={idx}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none text-center space-y-1 shadow-none"
            >
              <div className="text-2xl sm:text-3xl font-black text-brand-primary">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div id="contact" className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Contact Our Team
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none">
                <div className="h-9 w-9 rounded-none brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Email</div>
                  <a href={`mailto:${contact.email || "shameem.rml@gmail.com"}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-primary">
                    {contact.email || "shameem.rml@gmail.com"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none">
                <div className="h-9 w-9 rounded-none brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Phone & WhatsApp</div>
                  <a href={`tel:${contact.phone || "01973590937"}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-primary">
                    {contact.phone || "01973590937"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none">
                <div className="h-9 w-9 rounded-none brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Office</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {contact.address || "Gulshan-2, Dhaka-1212, Bangladesh"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none">
                <div className="h-9 w-9 rounded-none brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Hours</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {contact.supportHours || "24/7 Dedicated Support"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Message Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-none">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Send a Message</h4>

            {submitted ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 rounded-none">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <h5 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Message Received!</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400">We will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
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
                    className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
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
                    className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Your inquiry details..."
                    className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-none bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition flex items-center justify-center gap-2"
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
