import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AboutContact } from "@/components/landing/AboutContact";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Dynamic 3-Item Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />

        {/* Clean Modern Pricing CTA Preview Section */}
        <section className="py-20 2xl:py-28 bg-gradient-to-b from-slate-100/80 to-white dark:from-slate-900/50 dark:to-slate-950 border-y border-slate-200/80 dark:border-slate-800/80">
          <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 text-center space-y-6 2xl:space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border brand-subtle-border brand-subtle-bg text-brand-primary text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span>Transparent & Scalable Tiers</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Predictable Pricing For Every Pharmacy Scale
            </h2>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Choose from Starter, Growth, and Enterprise plans starting at ৳500/month.
              All plans include 100% offline POS resilience.
            </p>

            {/* Benefit pills */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 pt-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Zero downtime guarantee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Cancel or upgrade anytime</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-brand-primary text-white text-base font-bold shadow-md hover:opacity-95 hover:shadow-lg transition-all active:scale-95"
              >
                <span>View Full Subscription Plans</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm"
              >
                Talk To Our Specialists
              </Link>
            </div>
          </div>
        </section>

        <AboutContact />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
