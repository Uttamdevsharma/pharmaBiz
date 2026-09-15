"use client";

import React from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { Pill, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-16 2xl:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 2xl:gap-16 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              {settings.logoUrl ? (
                <div className="h-9 w-9 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-700 flex items-center justify-center p-1 shadow-sm">
                  <img
                    src={settings.logoUrl}
                    alt={settings.siteName || "Logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-sm">
                  <Pill className="h-5 w-5 transform -rotate-45" />
                </div>
              )}
              <span className="text-2xl font-extrabold tracking-tight text-white">
                {settings.siteName?.replace(/\s+SaaS$/i, "") || "PharmaBiz"}
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Multi-tenant, offline-first pharmacy management and POS operating system designed for modern healthcare enterprises.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-emerald-400 border border-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Multi-Tenant Data Isolation & HIPAA/VAT Compliant</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-bold text-white tracking-wider">Quick Navigation</h5>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition">Home</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition">Pricing Plans</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/#features" className="hover:text-white transition">Platform Features</Link></li>
            </ul>
          </div>

          {/* Legal & Portals */}
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-bold text-white tracking-wider">Portals</h5>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition">Super Admin Login</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Pharmacy Owner Portal</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Enterprise Inquiries</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition">Compare Tiers</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <div>
            © {new Date().getFullYear()} {settings.siteName || "PharmaBiz"}. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            <span>Built with precision for healthcare reliability</span>
            <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
