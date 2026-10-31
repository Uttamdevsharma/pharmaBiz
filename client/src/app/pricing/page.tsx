"use client";

import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { LandingPricing } from "@/components/landing/LandingPricing";

export default function PricingPage() {
  return (
    <div
      suppressHydrationWarning
      className="landing-scope flex min-h-screen flex-col"
    >
      <Navbar />

      <main className="flex-1 pt-12">
        <LandingPricing />
      </main>

      <Footer />
    </div>
  );
}
