"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { Pill, Menu, X, ArrowRight, Shield } from "lucide-react";

export function Navbar() {
  const { settings } = useSettings();
  const { isAuthenticated, isSuperAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            {settings.logoUrl ? (
              <div className="h-11 w-11 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-sm transition-transform group-hover:scale-105">
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName || "Logo"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-11 w-11 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
                <Pill className="h-6 w-6 transform -rotate-45" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {settings.siteName || "PharmaFlow"}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-primary">
                Multi-Tenant SaaS
              </span>
            </div>
          </Link>

          {/* Static Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#hero" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
              Home
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors">
              Contact
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                href={isSuperAdmin ? "/admin" : "/dashboard"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Shield className="h-4 w-4 text-brand-primary" />
                {isSuperAdmin ? "Super Admin" : "Dashboard"}
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-primary transition px-3 py-2"
              >
                Login
              </Link>
            )}

            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold shadow-sm hover:opacity-90 hover:shadow-md transition-all active:scale-95"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg px-4 pt-2 pb-6 space-y-3">
          <a
            href="#hero"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Pricing
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            About
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Contact
          </a>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {isAuthenticated ? "Go to Dashboard" : "Login"}
            </Link>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center font-semibold text-white bg-brand-primary rounded-lg shadow"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
