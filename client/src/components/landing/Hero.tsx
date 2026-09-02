"use client";

import React from "react";
import { useSettings } from "@/context/SettingsContext";
import { ArrowRight, Sparkles, Activity, Wifi, ShieldCheck, Layers, Store } from "lucide-react";

export function Hero() {
  const { settings } = useSettings();
  const hero = settings.hero || {};

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full brand-glow -z-10 opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-blue-500/10 -z-10 blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Dynamic Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border brand-subtle-border brand-subtle-bg text-brand-primary text-sm font-semibold tracking-wide shadow-sm animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>{hero.badge || "Next-Gen Multi-Tenant Pharmacy Platform"}</span>
          </div>

          {/* Dynamic Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            {hero.title ? (
              hero.title
            ) : (
              <>
                Empower Your Pharmacy Chain With Smart{" "}
                <span className="text-brand-primary">Offline-First SaaS</span>
              </>
            )}
          </h1>

          {/* Dynamic Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {hero.subtitle ||
              "Centralized pricing, real-time inventory management, multi-branch control, automated POS, and zero downtime even when the internet is disconnected."}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
            <a
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-brand-primary text-white text-base font-bold shadow-lg hover:opacity-95 hover:shadow-xl transition-all active:scale-95"
            >
              {hero.ctaPrimaryText || "Get Started Now"}
              <ArrowRight className="h-5 w-5" />
            </a>

            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm"
            >
              {hero.ctaSecondaryText || "Explore Features"}
            </a>
          </div>

          {/* Key Highlights Pill Group */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <span>100% Offline POS Resilience</span>
            </div>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-blue-500" />
              <span>Multi-Branch Inventory Synchronization</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-primary" />
              <span>Role-Based Controlled Drug Protection</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Mockup Card */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl p-4 sm:p-6 backdrop-blur-xl transition-all hover:border-slate-300 dark:hover:border-slate-700">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-mono text-slate-400">pharmabiz-hq.cloud/dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Sync Active
                </span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Branch Network</span>
                  <Store className="h-4 w-4 text-brand-primary" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">12 Branches</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span>● All Online & Synced</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Today's Counter POS Sales</span>
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">৳ 248,500</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <span>1,420 Completed Transactions</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Inventory Health</span>
                  <Layers className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">99.4% In-Stock</div>
                <div className="text-xs text-slate-500">
                  <span>0 Critical Expiries</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
