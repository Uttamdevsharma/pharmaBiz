"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useSettings } from "@/context/SettingsContext";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  HelpCircle,
  PhoneCall,
} from "lucide-react";

export default function PricingPage() {
  const { settings } = useSettings();
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const fallbackPlans = [
    {
      id: "2dce3e28-aa8c-4c46-80a1-9ef16a9ea082",
      name: "Starter",
      tier: "STARTER",
      price: 500,
      billingCycle: "MONTHLY",
      maxBranches: 2,
      maxStaffPerBranch: 1,
      description: "Ideal for small independent pharmacies and single retail drugstores.",
      features: {
        branches: "Max 2 Branches (Main + 1)",
        staff: "1 Staff per Branch",
        inventoryTransfers: false,
        regionalAdmin: false,
        apiAccess: false,
        branchPriceOverride: false,
        auditReports: "Basic Audit Trail",
      },
      isActive: true,
    },
    {
      id: "0884fe52-c28e-4220-a9d8-98d25df941da",
      name: "Growth",
      tier: "GROWTH",
      price: 1500,
      billingCycle: "MONTHLY",
      maxBranches: 3,
      maxStaffPerBranch: 3,
      description: "For expanding pharmacy chains requiring multi-branch transfers and staff management.",
      isPopular: true,
      features: {
        branches: "Max 3 Branches",
        staff: "3 Staff per Branch",
        inventoryTransfers: true,
        regionalAdmin: true,
        apiAccess: false,
        branchPriceOverride: true,
        auditReports: "Standard Reports & Inter-Branch Transfers",
      },
      isActive: true,
    },
    {
      id: "3255639f-879d-48bf-9882-f9f4ad7e5c8b",
      name: "Enterprise",
      tier: "ENTERPRISE",
      price: 3000,
      billingCycle: "MONTHLY",
      maxBranches: 999,
      maxStaffPerBranch: 999,
      description: "Designed for large hospital networks and nationwide pharmaceutical chains.",
      features: {
        branches: "Unlimited Branches",
        staff: "Unlimited Staff",
        inventoryTransfers: true,
        regionalAdmin: true,
        apiAccess: true,
        branchPriceOverride: true,
        auditReports: "Custom & VAT/MIS Compliance Export",
      },
      isActive: true,
    },
  ];

  const rawPlans = settings.plans && settings.plans.length > 0 ? settings.plans : fallbackPlans;
  const paidPlans = rawPlans.filter((p: any) => p.tier !== "TRIAL");

  // Calculate pricing based on cycle (Yearly gets 20% discount)
  const getDisplayPrice = (monthlyPrice: number | string) => {
    const num = typeof monthlyPrice === "string" ? parseFloat(monthlyPrice) : monthlyPrice;
    if (isNaN(num)) return 0;
    if (billingCycle === "YEARLY") {
      return Math.round(num * 12 * 0.8);
    }
    return num;
  };

  const comparisonRows = [
    { feature: "Active Branches", starter: "Up to 2", growth: "Up to 3", enterprise: "Unlimited" },
    { feature: "Staff per Branch", starter: "1 Staff", growth: "3 Staff", enterprise: "Unlimited" },
    { feature: "100% Offline POS", starter: true, growth: true, enterprise: true },
    { feature: "Automatic Cloud Sync", starter: true, growth: true, enterprise: true },
    { feature: "Barcode & Expiry Alerts", starter: true, growth: true, enterprise: true },
    { feature: "Inter-Branch Stock Transfers", starter: false, growth: true, enterprise: true },
    { feature: "Regional Manager Access", starter: false, growth: true, enterprise: true },
    { feature: "Branch Price Overrides", starter: false, growth: true, enterprise: true },
    { feature: "VAT & Tax Compliance Export", starter: false, growth: "Standard", enterprise: "Advanced / MIS" },
    { feature: "Developer API & Webhooks", starter: false, growth: false, enterprise: true },
    { feature: "Support SLA", starter: "Email Support", growth: "Priority Email & Phone", enterprise: "24/7 Dedicated Manager" },
  ];

  const faqs = [
    {
      q: "Can I upgrade or downgrade my plan at any time?",
      a: "Yes. You can upgrade immediately from your billing portal. When upgrading, prorated charges apply automatically.",
    },
    {
      q: "What payment methods do you support in Bangladesh?",
      a: "We support instant online checkout via SSLCOMMERZ with bKash, Nagad, Rocket, Visa, Mastercard, and corporate bank transfer.",
    },
    {
      q: "Are there any setup fees or hidden costs?",
      a: "No, there are zero setup fees or hidden charges. You only pay the subscription fee for your selected plan.",
    },
    {
      q: "Does counter POS billing stop if our internet goes down?",
      a: "Never. PharmaBiz is engineered with an offline-first architecture. Sales continue without interruption and sync up the moment connection restores.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <main className="flex-1 pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden">
        {/* Header Section */}
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <div className="text-center max-w-3xl 2xl:max-w-4xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border brand-subtle-border brand-subtle-bg text-brand-primary text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span>Simple, Predictable SaaS Pricing</span>
            </div>

            <h1 className="text-3xl sm:text-5xl 2xl:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Plans Built For Modern Pharmacies
            </h1>

            <p className="text-base sm:text-lg 2xl:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              Transparent subscriptions tailored for single store dispensaries to nationwide pharmacy chains.
              No hidden charges. No long-term lock-in.
            </p>

            {/* Billing Cycle Toggle */}
            <div className="pt-4 flex items-center justify-center">
              <div className="p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl inline-flex items-center gap-1 border border-slate-300/60 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    billingCycle === "MONTHLY"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    billingCycle === "YEARLY"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
          </div>


          {/* Paid Plans Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 2xl:gap-10 w-full">
            {paidPlans.map((plan: any, idx: number) => {
              const displayPrice = getDisplayPrice(plan.price);
              const isPopular = plan.tier === "GROWTH" || plan.isPopular;

              return (
                <div
                  key={plan.id || idx}
                  className={`relative rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-300 flex flex-col p-6 sm:p-8 2xl:p-10 ${
                    isPopular
                      ? "border-emerald-500 shadow-xl ring-2 ring-emerald-500/30 md:-translate-y-2"
                      : "border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {plan.name || plan.tier}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md brand-subtle-bg text-brand-primary uppercase">
                        {plan.tier}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-h-[40px]">
                      {plan.description ||
                        (plan.tier === "STARTER"
                          ? "Essential toolkit for retail pharmacies starting out."
                          : plan.tier === "GROWTH"
                          ? "Full multi-branch control and stock transfers."
                          : "Custom compliance, APIs, and unlimited scale.")}
                    </p>

                    {/* Price Block */}
                    <div className="pt-2 flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                        ৳ {displayPrice.toLocaleString()}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        {billingCycle === "YEARLY" ? "/year" : "/month"}
                      </span>
                    </div>
                  </div>

                  {/* Plan Call to Action */}
                  <div className="pt-6">
                    <Link
                      href={`/register?planId=${plan.id}&billing=${billingCycle}`}
                      className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        isPopular
                          ? "bg-brand-primary text-white shadow-md hover:opacity-95 hover:shadow-lg"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>Choose {plan.name?.split("-")[1] || plan.name || plan.tier}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {/* Features List */}
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3.5 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Included Capabilities
                    </div>

                    <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>
                          <strong>{plan.maxBranches >= 999 ? "Unlimited" : plan.maxBranches}</strong> Branches
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>
                          <strong>{plan.maxStaffPerBranch >= 999 ? "Unlimited" : plan.maxStaffPerBranch}</strong> Staff / Branch
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>100% Offline POS & Auto Cloud Sync</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        {plan.features?.inventoryTransfers ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className={plan.features?.inventoryTransfers ? "" : "text-slate-400 line-through"}>
                          Inter-Branch Stock Movement
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        {plan.features?.regionalAdmin ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className={plan.features?.regionalAdmin ? "" : "text-slate-400 line-through"}>
                          Regional Manager Role
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        {plan.features?.apiAccess ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className={plan.features?.apiAccess ? "" : "text-slate-400 line-through"}>
                          External API & ERP Integrations
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Comparison Matrix */}
          <div className="mt-20 max-w-5xl 2xl:max-w-6xl mx-auto">
            <div className="text-center space-y-3 mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Detailed Plan Feature Matrix
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Compare limits and features side-by-side to select the right tier.
              </p>
            </div>

            <div className="table-responsive-container rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full min-w-[650px] text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50">
                    <th className="py-4 px-6 font-bold text-slate-900 dark:text-white">Platform Feature</th>
                    <th className="py-4 px-6 font-bold text-slate-900 dark:text-white text-center">Starter</th>
                    <th className="py-4 px-6 font-bold text-brand-primary text-center">Growth</th>
                    <th className="py-4 px-6 font-bold text-slate-900 dark:text-white text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-6 font-medium text-slate-700 dark:text-slate-200">
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-6 text-center text-slate-600 dark:text-slate-300">
                        {typeof row.starter === "boolean" ? (
                          row.starter ? (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-slate-400 mx-auto" />
                          )
                        ) : (
                          row.starter
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center font-semibold text-slate-800 dark:text-slate-100 bg-emerald-50/30 dark:bg-emerald-950/10">
                        {typeof row.growth === "boolean" ? (
                          row.growth ? (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-slate-400 mx-auto" />
                          )
                        ) : (
                          row.growth
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center text-slate-600 dark:text-slate-300">
                        {typeof row.enterprise === "boolean" ? (
                          row.enterprise ? (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-slate-400 mx-auto" />
                          )
                        ) : (
                          row.enterprise
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing FAQ */}
          <div className="mt-20 max-w-4xl 2xl:max-w-5xl mx-auto">
            <div className="text-center space-y-3 mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Everything You Need To Know About Pricing
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{faq.q}</h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Consultation Banner */}
          <div className="mt-16 max-w-4xl 2xl:max-w-5xl mx-auto rounded-3xl bg-slate-900 text-white p-8 sm:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold">Have complex multi-chain requirements?</h3>
              <p className="text-sm text-slate-400 max-w-md">
                Our healthcare deployment specialists will consult with you to design a custom hardware and cloud sync architecture.
              </p>
            </div>
            <Link
              href="/contact"
              className="px-6 py-3.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow hover:opacity-90 transition shrink-0 flex items-center gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              Contact Our Team
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
