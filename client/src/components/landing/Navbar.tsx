"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { Pill, Menu, X, ArrowRight, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { isAuthenticated, isSuperAdmin, isPlatformStaff, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-20 sm:h-22">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3.5 group">
            {settings.logoUrl ? (
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shadow-sm transition-transform group-hover:scale-105 shrink-0">
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName || "Logo"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 shrink-0">
                <Pill className="h-7 w-7 sm:h-8 sm:w-8 transform -rotate-45" />
              </div>
            )}
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-primary">
              {settings.siteName?.replace(/\s+SaaS$/i, "") || "PharmaBiz"}
            </span>
          </Link>

          {/* Centered Desktop Nav Items - Exactly 3 items */}
          <nav className="hidden md:flex items-center gap-10">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "text-brand-primary font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-brand-primary"
              }`}
            >
              Home
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors ${
                pathname === "/pricing"
                  ? "text-brand-primary font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-brand-primary"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors ${
                pathname === "/contact"
                  ? "text-brand-primary font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-brand-primary"
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                href={isPlatformStaff ? "/admin" : "/dashboard"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Shield className="h-4 w-4 text-brand-primary" />
                {isSuperAdmin
                  ? "Super Admin"
                  : isPlatformStaff
                  ? user?.role === "CTO"
                    ? "Platform CTO"
                    : "Project Manager"
                  : "Dashboard"}
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold border border-brand-primary/40 text-brand-primary hover:bg-brand-primary hover:text-white transition-all px-4 py-2 rounded-xl shadow-xs active:scale-95"
              >
                Login
              </Link>
            )}

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold shadow-sm hover:opacity-90 hover:shadow-md transition-all active:scale-95"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile Menu Toggle & Quick Theme Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2 shadow-xl">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === "/"
                ? "text-brand-primary bg-brand-primary/10 font-semibold"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Home
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === "/pricing"
                ? "text-brand-primary bg-brand-primary/10 font-semibold"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === "/contact"
                ? "text-brand-primary bg-brand-primary/10 font-semibold"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Contact
          </Link>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Theme</span>
              <ThemeToggle variant="pill" />
            </div>
            <Link
              href={isPlatformStaff ? "/admin" : isAuthenticated ? "/dashboard" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full py-2.5 text-center font-semibold rounded-xl transition ${
                isAuthenticated
                  ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800"
                  : "text-brand-primary border border-brand-primary/40 hover:bg-brand-primary hover:text-white"
              }`}
            >
              {isAuthenticated ? (isPlatformStaff ? "Go to Platform Console" : "Go to Dashboard") : "Login"}
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center font-semibold text-white bg-brand-primary rounded-xl shadow"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
