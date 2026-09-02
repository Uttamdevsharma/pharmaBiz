"use client";

import React from "react";
import { useSettings } from "@/context/SettingsContext";
import { CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const { settings } = useSettings();
  const steps = settings.howItWorks || [];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider brand-subtle-bg text-brand-primary border brand-subtle-border">
            Fast Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How PharmaBiz Works
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Set up your pharmacy in minutes and operate offline without complicated IT infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all space-y-5"
            >
              {/* Step Number Pill */}
              <div className="flex items-center justify-between">
                <span className="h-10 w-10 rounded-xl bg-brand-primary text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {item.step || idx + 1}
                </span>
                <CheckCircle2 className="h-5 w-5 text-brand-primary opacity-60" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
