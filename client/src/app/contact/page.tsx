"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import {
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pharmacyName: "",
    subject: "Sales & Subscription Plans",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    // Simulate brief send delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        pharmacyName: "",
        subject: "Sales & Subscription Plans",
        message: "",
      });
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <main className="flex-1 pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border brand-subtle-border brand-subtle-bg text-brand-primary text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span>Dedicated Healthcare Support</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Get In Touch With PharmaBiz
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Have questions regarding offline POS deployment, branch data migration, or enterprise compliance?
              Our specialized team is here to assist you.
            </p>
          </div>

          {/* 2-Column Contact Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
            {/* Left Column: Direct Contact Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Direct Channels
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Reach out directly via phone or email for prompt technical and sales assistance.
                </p>
              </div>

              {/* Email Card */}
              <a
                href="mailto:shameem.rml@gmail.com"
                className="group flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all block"
              >
                <div className="h-12 w-12 rounded-xl brand-subtle-bg flex items-center justify-center text-brand-primary shrink-0 transition-transform group-hover:scale-110">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Official Email
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors break-all">
                    shameem.rml@gmail.com
                  </div>
                  <div className="text-xs text-slate-500">
                    Typical response time: under 2 hours
                  </div>
                </div>
              </a>

              {/* Phone Card */}
              <a
                href="tel:01973590937"
                className="group flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all block"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Phone & WhatsApp
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    01973590937
                  </div>
                  <div className="text-xs text-slate-500">
                    Direct line for quick inquiries & support
                  </div>
                </div>
              </a>

              {/* Working Hours Card */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Operational Hours
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Saturday – Thursday: 9:00 AM – 9:00 PM
                  </div>
                  <div className="text-xs text-slate-500">
                    Cloud monitoring active 24/7/365
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Enterprise-grade data isolation and SSL-encrypted transactions for all pharmacies.
                </span>
              </div>
            </div>

            {/* Right Column: Clean Contact Form */}
            <div className="lg:col-span-7">
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary">
                    <MessageSquare className="h-4 w-4" />
                    Send a Message
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    How can we assist you?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Fill out the form below and an engineer will reply directly to your email or phone.
                  </p>
                </div>

                {isSubmitted ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3 animate-fade-in">
                    <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      Message Received!
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                      Thank you for contacting us. We have received your inquiry and will get back to you shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="text-xs font-bold text-brand-primary hover:underline pt-2 inline-block"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Your Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Dr. Kamal Ahmed"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@pharmacy.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Phone / Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Pharmacy / Business Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Pharmacy / Brand Name
                        </label>
                        <input
                          type="text"
                          value={formData.pharmacyName}
                          onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                          placeholder="e.g., Al-Madina Pharmacy"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Topic of Inquiry
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Sales & Subscription Plans">Sales & Subscription Plans</option>
                        <option value="Offline POS & Hardware Setup">Offline POS & Hardware Setup</option>
                        <option value="Multi-Branch Chain Migration">Multi-Branch Chain Migration</option>
                        <option value="Enterprise & Custom ERP Integration">Enterprise & Custom ERP Integration</option>
                        <option value="General Support">General Support</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Please describe how we can assist you..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-md hover:opacity-95 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Sending message...</span>
                      ) : (
                        <>
                          <span>Submit Message</span>
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
