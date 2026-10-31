"use client";

import React from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { useLanguage } from "@/context/LanguageContext";
import { Pill, MapPin, Mail, Phone, Heart } from "lucide-react";

export function Footer() {
  const { settings } = useSettings();
  const { t } = useLanguage();

  return (
    <footer className="bg-white text-slate-600 border-t border-slate-200">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              {settings.logoUrl ? (
                <div className="h-10 w-10 rounded-none overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1">
                  <img
                    src={settings.logoUrl}
                    alt={settings.siteName || "Logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-none bg-brand-primary flex items-center justify-center text-white">
                  <Pill className="h-5 w-5 transform -rotate-45" />
                </div>
              )}
              <span className="text-2xl lg:text-3xl font-black tracking-tight text-brand-primary">
                {settings.siteName?.replace(/\s+SaaS$/i, "") || "BizPharma"}
              </span>
            </Link>
            <p className="text-sm sm:text-base text-slate-500 max-w-sm leading-relaxed">
              {t("footerDesc")}
            </p>
          </div>

          {/* Platform Col */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs sm:text-sm uppercase font-extrabold text-slate-900 tracking-wider">
              {t("platform")}
            </h5>
            <ul className="space-y-2 text-sm sm:text-base">
              <li>
                <Link href="/" className="hover:text-brand-primary transition">
                  {t("homeOverview")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-brand-primary transition">
                  {t("subPlans")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-brand-primary transition">
                  {t("registerKyc")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-primary transition">
                  {t("posPortalLogin")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Key Solutions Col */}
          <div className="lg:col-span-3 space-y-3">
            <h5 className="text-xs sm:text-sm uppercase font-extrabold text-slate-900 tracking-wider">
              {t("keySolutions")}
            </h5>
            <ul className="space-y-2 text-sm sm:text-base">
              <li>
                <Link href="/pricing" className="hover:text-brand-primary transition">
                  {t("barcodePos")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-brand-primary transition">
                  {t("stockTransfer")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-brand-primary transition">
                  {t("financeLedger")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-brand-primary transition">
                  {t("expiryTracking")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-brand-primary transition">
                  {t("thermalPrinting")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support Col */}
          <div className="lg:col-span-3 space-y-3">
            <h5 className="text-xs sm:text-sm uppercase font-extrabold text-slate-900 tracking-wider">
              {t("contactSupport")}
            </h5>
            <ul className="space-y-2.5 text-sm sm:text-base">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                <span>60 Feet Road, Mirpur, Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-brand-primary shrink-0" />
                <a href="mailto:uttam23412@gmail.com" className="hover:text-brand-primary transition break-all">
                  uttam23412@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-brand-primary shrink-0" />
                <a href="tel:+8801744155760" className="hover:text-brand-primary transition">
                  +880 1744-155760
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar matching Image 2 */}
        <div className="pt-6 border-t border-slate-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <div>
            © {new Date().getFullYear()} {settings.siteName || "PharmaBiz"}. {t("allRightsReserved")}
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span>{t("craftedWith")}</span>
            <a
              href="https://okobiz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary font-bold hover:underline"
            >
              Okobiz
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
