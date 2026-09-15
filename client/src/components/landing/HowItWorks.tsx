"use client";

import React from "react";
import { useSettings } from "@/context/SettingsContext";
import { CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  const { settings } = useSettings();
  const steps = settings.howItWorks || [];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="text-center max-w-3xl 2xl:max-w-4xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider brand-subtle-bg text-brand-primary border brand-subtle-border">
            Fast Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How PharmaBiz Works
          </h2>
          <p className="text-base sm:text-lg 2xl:text-xl text-slate-600 dark:text-slate-400">
            Set up your pharmacy in minutes and operate offline without complicated IT infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 2xl:gap-10 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative p-7 sm:p-8 2xl:p-10 rounded-2xl 2xl:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all space-y-5"
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
