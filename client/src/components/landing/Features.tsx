"use client";

import React from "react";
import { useSettings } from "@/context/SettingsContext";
import {
  Zap,
  Building2,
  ShieldAlert,
  ArrowLeftRight,
  ShieldCheck,
  CreditCard,
  Layers,
  BarChart3,
  LucideIcon,
} from "lucide-react";

// Icon mapping helper
const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Building2,
  ShieldAlert,
  ArrowLeftRight,
  ShieldCheck,
  CreditCard,
  Layers,
  BarChart3,
};

export function Features() {
  const { settings } = useSettings();
  const features = settings.features || [];

  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider brand-subtle-bg text-brand-primary border brand-subtle-border">
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Engineered For Zero Downtime & Maximum Control
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            From single pharmacies to 50+ store chains, get everything required to run high-volume sales, manage batches, and protect profit margins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const IconComponent = (feature.icon && ICON_MAP[feature.icon]) || Zap;

            return (
              <div
                key={feature.id || idx}
                className="group relative p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl brand-subtle-bg flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center text-xs font-semibold text-brand-primary">
                  <span>Learn more</span>
                  <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
