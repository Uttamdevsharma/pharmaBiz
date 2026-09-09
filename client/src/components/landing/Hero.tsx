"use client";

import React from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { ArrowRight, Sparkles, Wifi, ShieldCheck, Store, CheckCircle2 } from "lucide-react";

export function Hero() {
  const { settings } = useSettings();
  const hero = settings.hero || {};

  return (
    <section id="hero" className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full brand-glow -z-10 opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute top-16 right-0 w-80 h-80 rounded-full bg-teal-500/10 -z-10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Content & CTAs */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start text-left space-y-6 sm:space-y-8">
            {/* SaaS Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border brand-subtle-border brand-subtle-bg text-brand-primary text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>{hero.badge || "Next-Gen Multi-Tenant Pharmacy Platform"}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
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
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {hero.subtitle ||
                "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime even when the internet is disconnected."}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-1">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-brand-primary text-white text-base font-bold shadow-md hover:opacity-95 hover:shadow-lg transition-all active:scale-95 text-center"
              >
                {hero.ctaPrimaryText || "Get Started Now"}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm text-center"
              >
                {hero.ctaSecondaryText || "View Pricing Plans"}
              </Link>
            </div>

            {/* Key Value Highlights */}
            <div className="pt-2 flex flex-wrap items-center gap-y-3 gap-x-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Wifi className="h-4 w-4" />
                </div>
                <span>100% Offline POS Resilience</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Store className="h-4 w-4" />
                </div>
                <span>Multi-Branch Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md brand-subtle-bg text-brand-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Role-Based Controlled Drugs</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Image Showcase */}
          <div className="lg:col-span-6 xl:col-span-5 w-full">
            <div className="relative mx-auto max-w-md sm:max-w-lg lg:max-w-none">
              {/* Subtle background glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-emerald-500/30 to-teal-500/30 rounded-3xl blur-xl opacity-70 -z-10" />

              {/* Main Image Card Frame */}
              <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-2xl backdrop-blur-sm overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
                <img
                  src="/hero-right.jpg"
                  alt="PharmaBiz Intelligent Pharmacy Operating System"
                  className="w-full h-auto object-cover rounded-xl sm:rounded-2xl max-h-[460px]"
                  loading="eager"
                />

                {/* Floating Status Badge - Top Right */}
                <div className="absolute top-5 right-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-white text-xs font-semibold shadow-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Cloud Sync Active</span>
                </div>

                {/* Floating Metrics Pill - Bottom Left */}
                <div className="absolute bottom-5 left-5 right-5 sm:right-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xl flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
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
