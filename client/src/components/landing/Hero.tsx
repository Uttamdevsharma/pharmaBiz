"use client";

import React from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { ArrowRight, Sparkles, Wifi, ShieldCheck, Store, CheckCircle2 } from "lucide-react";

export function Hero() {
  const { settings } = useSettings();
  const hero = settings.hero || {};

  return (
    <section
      id="hero"
      className="relative pt-28 pb-12 sm:pt-32 sm:pb-14 md:pt-36 md:pb-16 lg:pt-38 lg:pb-16 xl:pt-40 xl:pb-20 overflow-hidden flex flex-col justify-center min-h-[calc(100vh-5rem)] lg:min-h-[700px]"
    >
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] sm:w-[750px] h-[550px] sm:h-[750px] rounded-full brand-glow -z-10 opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute top-16 right-0 w-96 h-96 rounded-full bg-teal-500/10 -z-10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 xl:gap-12 items-center">
          {/* Left Column: Content & CTAs */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start text-left space-y-6 sm:space-y-8">
            {/* SaaS Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border brand-subtle-border brand-subtle-bg text-brand-primary text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>{hero.badge || "Next-Gen Multi-Tenant Pharmacy Platform"}</span>
            </div>

            {/* Main Headline (56-64px on desktop) */}
            <h1 className="text-3xl sm:text-5xl lg:text-[56px] xl:text-[64px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] lg:leading-[1.08]">
              {hero.title ? (
                hero.title
              ) : (
                <>
                  Empower Your Pharmacy Chain With Smart{" "}
                  <span className="text-brand-primary">Offline-First SaaS</span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {hero.subtitle ||
                "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime even when the internet is disconnected."}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-1">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-brand-primary text-white text-base sm:text-lg font-bold shadow-lg shadow-emerald-600/20 hover:opacity-95 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 text-center"
              >
                {hero.ctaPrimaryText || "Get Started Now"}
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base sm:text-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm hover:-translate-y-0.5 text-center"
              >
                {hero.ctaSecondaryText || "View Pricing Plans"}
              </Link>
            </div>

            {/* Key Value Highlights */}
            <div className="pt-2 flex flex-wrap items-center gap-y-3 gap-x-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Wifi className="h-4 w-4" />
                </div>
                <span>100% Offline POS Resilience</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Store className="h-4 w-4" />
                </div>
                <span>Multi-Branch Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg brand-subtle-bg text-brand-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Role-Based Controlled Drugs</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image Showcase (500-560px on desktop) */}
          <div className="lg:col-span-6 xl:col-span-6 w-full flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] sm:max-w-[520px] lg:max-w-[510px] xl:max-w-[560px]">
              {/* Subtle background glow */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500/30 to-teal-500/30 rounded-3xl blur-2xl opacity-70 -z-10" />

              {/* Main Image Card Frame */}
              <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-sm overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
                <img
                  src="/hero-right.jpg"
                  alt="PharmaBiz Intelligent Pharmacy Operating System"
                  className="w-full h-auto object-cover rounded-xl sm:rounded-2xl"
                  loading="eager"
                />

                {/* Floating Status Badge - Top Right */}
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-white text-xs font-semibold shadow-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Cloud Sync Active</span>
                </div>

                {/* Floating Metrics Pill - Bottom Left */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Offline-First Engine
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Zero downtime even during outages
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
