import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSection } from "@/components/landing/PricingSection";
import { AboutContact } from "@/components/landing/AboutContact";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Dynamic Navbar with Static Menu */}
      <Navbar />

      {/* Dynamic Landing Sections */}
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <PricingSection />
        <AboutContact />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
