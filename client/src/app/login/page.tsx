"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Shield,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { settings } = useSettings();

  const [identifier, setIdentifier] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin1234");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Quick Demo Accounts Helper
  const setDemoCredentials = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.success) {
        // Read user role from localStorage to route correctly
        const stored = localStorage.getItem("user");
        const userObj = stored ? JSON.parse(stored) : null;

        if (["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(userObj?.role)) {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(res.message || "Invalid email/username or password");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#EBF2FC] dark:bg-slate-950 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Soft Ambient Background Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-200/50 dark:bg-blue-900/20 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl -z-10 pointer-events-none" />

      {/* Top Bar Navigation */}
      <div className="w-full max-w-5xl mb-4 flex items-center justify-between z-10 px-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <span className="text-xs font-bold text-slate-400">
          PharmaBiz Cloud v2.0
        </span>
      </div>

      {/* MAIN CENTERED CARD MATCHING REFERENCE DESIGN */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[36px] shadow-2xl shadow-blue-900/10 dark:shadow-black/50 border border-white/60 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px] relative z-10">
        {/* LEFT COLUMN: LOGIN FORM */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between z-10 bg-white dark:bg-slate-900">
          <div>
            {/* 1. Login Heading */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E2A5A] dark:text-white tracking-tight">
              Login
            </h1>

            {/* 2. Welcome Subtitle */}
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-6 sm:mt-8 mb-6">
              Welcome to {settings.siteName ? "PharmaBiz" : "PharmaBiz"}
            </h2>

            {/* Error Notification */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username / Email Field */}
              <div>
                <div className="relative flex items-center">
                  <User className="h-4 w-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Username or email"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="relative flex items-center">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition"
                  >
                    Forgot?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-2xl bg-[#4C6FFF] hover:bg-[#3D5FE6] text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Demo Credentials Footer Helper */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Shield className="h-3 w-3 text-indigo-500" />
              <span>Quick Login Credentials</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDemoCredentials("admin@gmail.com", "admin1234")}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("owner@gmail.com", "owner1234")}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                Pharmacy Owner
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials("cashier@gmail.com", "cashier1234")}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                Cashier
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PHARMACY ILLUSTRATION WITH ORGANIC WAVE SEPARATION */}
        <div className="lg:col-span-6 bg-[#EDF3FD] dark:bg-slate-800/40 relative flex items-center justify-center p-6 sm:p-10 overflow-hidden min-h-[320px] lg:min-h-full">
          {/* S-Curve Wave Separator on Large Screens */}
          <div className="absolute inset-y-0 left-0 w-20 hidden lg:block pointer-events-none z-10">
            <svg
              className="h-full w-full text-white dark:text-slate-900"
              viewBox="0 0 100 800"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              {/* Smooth organic wave mimicking the reference image */}
              <path d="M0,0 L100,0 C60,180 0,260 0,400 C0,540 80,620 100,800 L0,800 Z" />
            </svg>
          </div>

          {/* Secondary subtle wave glow shadow for depth */}
          <div className="absolute inset-y-0 left-0 w-24 hidden lg:block pointer-events-none opacity-20 text-blue-400">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 800"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,0 L80,0 C40,180 -10,260 -10,400 C-10,540 60,620 80,800 L0,800 Z" />
            </svg>
          </div>

          {/* Main Illustration: login-right.jpg */}
          <div className="relative w-full max-w-md flex items-center justify-center z-0 transition-transform duration-500 hover:scale-[1.02]">
            <img
              src="/login-right.jpg"
              alt="PharmaBiz Counter Illustration"
              className="w-full max-h-[460px] object-contain drop-shadow-md rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Account Recovery
                </h3>
                <p className="text-xs text-slate-400">Password Assistance</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have forgotten your password or username, please contact your pharmacy chain administrator or platform super admin to issue a temporary password reset token.
            </p>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
