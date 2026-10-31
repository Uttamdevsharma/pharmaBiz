import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div
      suppressHydrationWarning
      className="landing-scope flex min-h-screen flex-col"
    >
      <Navbar />

      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <LandingPricing />
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
