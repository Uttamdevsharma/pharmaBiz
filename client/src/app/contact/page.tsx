"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useLanguage } from "@/context/LanguageContext";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

export default function ContactPage() {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    outlets: "1 Single Outlet",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        outlets: "1 Single Outlet",
        message: "",
      });
    }, 600);
  };

  return (
    <div className="landing-scope flex min-h-screen flex-col bg-[#f8f9f2] text-[#102c28]">
      <Navbar />

      {/* Main Container - starts nicely below navbar with comfortable room */}
      <main className="flex-1 pt-32 pb-24 md:pt-36 md:pb-28">
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header section matching Image 3 */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{t("contactAssistPill")}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
              {t("contactTitle")}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t("contactSubtitle")}
            </p>
          </div>

          {/* 2-Column Contact Grid matching Image 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Direct Support Cards */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card 1: Email */}
              <div className="p-6 sm:p-7 rounded-none bg-white border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300">
                <div className="h-10 w-10 rounded-none bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {t("directSupportEmail")}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t("directSupportEmailDesc")}
                  </p>
                  <div className="pt-1">
                    <a
                      href="mailto:uttam23412@gmail.com"
                      className="text-sm font-bold text-sky-600 hover:underline break-all"
                    >
                      uttam23412@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 2: Phone / WhatsApp */}
              <div className="p-6 sm:p-7 rounded-none bg-white border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300">
                <div className="h-10 w-10 rounded-none bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {t("directPhoneWhatsapp")}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t("directPhoneHours")}
                  </p>
                  <div className="pt-1">
                    <a
                      href="tel:+8801744155760"
                      className="text-sm font-bold text-sky-600 hover:underline"
                    >
                      +880 1744-155760
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 3: Office Location */}
              <div className="p-6 sm:p-7 rounded-none bg-white border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300">
                <div className="h-10 w-10 rounded-none bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {t("officeLocation")}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
                    {t("officeLocationAddress")}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Send Us A Message Card */}
            <div className="lg:col-span-7">
              <div className="p-7 sm:p-9 rounded-none bg-white border border-slate-200 shadow-xs space-y-6">
                <div className="space-y-1.5 border-b border-slate-100 pb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {t("sendUsMessage")}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {t("sendMessageDesc")}
                  </p>
                </div>

                {isSubmitted ? (
                  <div className="p-8 rounded-none bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                    <h3 className="text-lg font-bold text-slate-900">
                      {t("messageReceived")}
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      {t("messageReceivedDesc")}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsSubmitted(false)}
                        className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                      >
                        {t("sendAnother")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          {t("fullName")}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Tanvir Ahmed"
                          className="w-full px-3.5 py-2.5 rounded-none border border-slate-300 bg-white text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          {t("businessEmail")}
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. tanvir@retailstore.com"
                          className="w-full px-3.5 py-2.5 rounded-none border border-slate-300 bg-white text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          {t("phoneNumber")}
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. 01712-345678"
                          className="w-full px-3.5 py-2.5 rounded-none border border-slate-300 bg-white text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          {t("outletsNumber")}
                        </label>
                        <select
                          value={formData.outlets}
                          onChange={(e) => setFormData({ ...formData, outlets: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-none border border-slate-300 bg-white text-sm focus:outline-none focus:border-brand-primary"
                        >
                          <option value="1 Single Outlet">{t("outletSingle")}</option>
                          <option value="2 to 5 Outlets">{t("outlets2to5")}</option>
                          <option value="6+ Enterprise Outlets">{t("outlets6plus")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        {t("helpQuestion")}
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={t("helpPlaceholder")}
                        className="w-full px-3.5 py-2.5 rounded-none border border-slate-300 bg-white text-sm focus:outline-none focus:border-brand-primary resize-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-none bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 transition shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                        <span>{isSubmitting ? t("sending") : t("sendMessageNow")}</span>
                      </button>
                    </div>
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
