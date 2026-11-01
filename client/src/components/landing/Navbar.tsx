"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Pill, Menu, X, ArrowRight, Shield, Globe } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { isAuthenticated, isSuperAdmin, isPlatformStaff, user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasActiveDemo = Boolean(
    settings.plans?.some(
      (p: any) =>
        p.isActive !== false &&
        (Number(p.trialDays) > 0 || p.tier === "TRIAL" || p.isTrial || p.features?.isTrial)
    )
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 landing-header bg-[#fbfbf5]/92 backdrop-blur-md border-b border-[#dce8e2] shadow-[0_2px_14px_rgba(16,44,40,0.03)] transition-colors">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-20 2xl:h-24">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            {settings.logoUrl ? (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl overflow-hidden bg-white border border-[#dce8e2] shadow-xs flex items-center justify-center p-1 shrink-0 transition-transform group-hover:scale-105">
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName || "Logo"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[#14996c] flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(20,153,108,0.25)] transition-transform group-hover:scale-105">
                <Pill className="h-6 w-6 sm:h-7 sm:w-7 transform -rotate-45" />
              </div>
            )}
            <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black tracking-tight text-[#102c28]">
              {settings.siteName && !settings.siteName.toLowerCase().includes("pharmabiz") ? settings.siteName.replace(/\s+SaaS$/i, "") : "BizPharma"}
            </span>
          </Link>

          {/* Centered Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10 xl:gap-12">
            <Link
              href="/"
              className={`text-[15px] 2xl:text-base font-semibold transition-colors ${
                pathname === "/"
                  ? "text-[#14996c] font-bold"
                  : "text-[#37524c] hover:text-[#14996c]"
              }`}
            >
              {t("home")}
            </Link>
            <Link
              href="/pricing"
              className={`text-[15px] 2xl:text-base font-semibold transition-colors ${
                pathname === "/pricing"
                  ? "text-[#14996c] font-bold"
                  : "text-[#37524c] hover:text-[#14996c]"
              }`}
            >
              {t("pricing")}
            </Link>
            <Link
              href="/contact"
              className={`text-[15px] 2xl:text-base font-semibold transition-colors ${
                pathname === "/contact"
                  ? "text-[#14996c] font-bold"
                  : "text-[#37524c] hover:text-[#14996c]"
              }`}
            >
              {t("contact")}
            </Link>
          </nav>

          {/* Action CTAs & Language Switcher */}
          <div className="hidden md:flex items-center gap-3 2xl:gap-3.5">
            {/* Language Switcher (EN / BN) */}
            <div className="h-10 inline-flex items-center border border-[#dce8e2] bg-white/75 backdrop-blur-sm p-1 rounded-xl shadow-xs">
              <Globe className="h-4 w-4 text-[#14996c] mx-1.5 shrink-0" />
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`h-8 px-3 rounded-lg text-[15px] 2xl:text-base font-bold transition-all cursor-pointer flex items-center justify-center ${
                  lang === "en"
                    ? "bg-[#14996c] text-white shadow-xs"
                    : "text-[#627572] hover:text-[#102c28] hover:bg-white/60"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={`h-8 px-3 rounded-lg text-[15px] 2xl:text-base font-bold transition-all cursor-pointer flex items-center justify-center ${
                  lang === "bn"
                    ? "bg-[#14996c] text-white shadow-xs"
                    : "text-[#627572] hover:text-[#102c28] hover:bg-white/60"
                }`}
              >
                BN
              </button>
            </div>

            {isAuthenticated ? (
              <Link
                href={isPlatformStaff ? "/admin" : "/dashboard"}
                className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-white/90 text-[#102c28] text-[15px] 2xl:text-base font-semibold border border-[#cbe0d6] hover:bg-white hover:border-[#14996c] hover:text-[#14996c] shadow-xs transition whitespace-nowrap"
              >
                <Shield className="h-4 w-4 text-[#14996c]" />
                {isSuperAdmin
                  ? t("superAdmin")
                  : isPlatformStaff
                  ? user?.role === "CTO"
                    ? "Platform CTO"
                    : "Project Manager"
                  : t("dashboard")}
              </Link>
            ) : (
              <Link
                href="/login"
                className="h-10 inline-flex items-center justify-center text-[15px] 2xl:text-base font-semibold border border-[#cbe0d6] bg-white/90 text-[#102c28] hover:bg-white hover:border-[#14996c] hover:text-[#14996c] px-6 rounded-xl shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap min-w-[84px]"
              >
                {t("login")}
              </Link>
            )}

            {hasActiveDemo && !isAuthenticated && (
              <Link
                href="/register?demo=true"
                className="h-10 inline-flex items-center justify-center px-5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[15px] 2xl:text-base font-semibold shadow-xs transition whitespace-nowrap"
              >
                {t("freeDemo")}
              </Link>
            )}

            <Link
              href="/register"
              className="h-10 inline-flex items-center justify-center gap-2 px-6 rounded-xl bg-[#14996c] hover:bg-[#0f835b] text-white text-[15px] 2xl:text-base font-bold shadow-[0_2px_10px_rgba(20,153,108,0.2)] hover:shadow-[0_4px_14px_rgba(20,153,108,0.28)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group whitespace-nowrap"
            >
              {t("getStarted")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle & Mobile Language Switch */}
          <div className="flex md:hidden items-center gap-2">
            <div className="inline-flex items-center border border-[#dce8e2] bg-white/80 p-0.5 rounded-lg shadow-xs">
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "bn" : "en")}
                className="px-3 py-1 text-[#102c28] font-black text-sm"
              >
                {lang.toUpperCase()}
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg text-[#102c28] hover:bg-white/80 border border-[#dce8e2] transition cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-5 pt-3 pb-6 landing-header-mobile bg-[#fbfbf5]/98 backdrop-blur-lg border-b border-[#dce8e2] shadow-xl space-y-2.5">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-lg text-base font-semibold ${
              pathname === "/"
                ? "text-[#14996c] bg-[#e9f8f0] font-bold"
                : "text-[#102c28] hover:bg-white/60"
            }`}
          >
            {t("home")}
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-lg text-base font-semibold ${
              pathname === "/pricing"
                ? "text-[#14996c] bg-[#e9f8f0] font-bold"
                : "text-[#102c28] hover:bg-white/60"
            }`}
          >
            {t("pricing")}
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-lg text-base font-semibold ${
              pathname === "/contact"
                ? "text-[#14996c] bg-[#e9f8f0] font-bold"
                : "text-[#102c28] hover:bg-white/60"
            }`}
          >
            {t("contact")}
          </Link>
          <div className="pt-3 border-t border-[#dce8e2] flex flex-col gap-2.5">
            <Link
              href={isPlatformStaff ? "/admin" : isAuthenticated ? "/dashboard" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 text-center font-bold text-sm sm:text-base rounded-lg border border-[#cbe0d6] bg-white text-[#102c28] shadow-xs"
            >
              {isAuthenticated ? (isPlatformStaff ? t("adminPanel") : t("dashboard")) : t("login")}
            </Link>
            {hasActiveDemo && !isAuthenticated && (
              <Link
                href="/register?demo=true"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center font-bold text-sm sm:text-base text-white bg-purple-700 rounded-lg shadow-sm"
              >
                {t("claimDemo")}
              </Link>
            )}
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 text-center font-bold text-sm sm:text-base text-white bg-[#14996c] rounded-lg shadow-md"
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
