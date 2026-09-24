"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { showAlert } from "@/lib/swal";
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
import { ThemeToggle } from "@/components/common/ThemeToggle";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { settings } = useSettings();

  const emailParam = searchParams.get("email") || "";
  const isApprovedParam = searchParams.get("approved") === "true";
  const isPaymentSuccess = searchParams.get("payment") === "success";

  const [identifier, setIdentifier] = useState(emailParam || "admin@gmail.com");
  const [password, setPassword] = useState(emailParam ? "" : "admin1234");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setIdentifier(emailParam);
    }
  }, [emailParam]);

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
      if (res.success && res.redirectUrl) {
        router.replace(res.redirectUrl);
      } else if (res.success) {
        router.replace("/dashboard");
      } else {
        const msg = res.message || "Invalid email/username or password";
        setError(msg);
        showAlert.error("Login Failed", msg);
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred. Please try again.";
      setError(msg);
      showAlert.error("Login Error", msg);
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

        <ThemeToggle />
      </div>

      {/* MAIN CENTERED CARD WITH SUBTLE ELEVATION ON SUBMIT */}
      <div
        className={`w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[36px] border border-white/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px] relative z-10 transition-all duration-500 ease-out ${
          loading
            ? "scale-[1.008] -translate-y-1.5 shadow-[0_30px_75px_-12px_rgba(76,111,255,0.22)]"
            : "shadow-[0_20px_50px_-15px_rgba(30,58,138,0.12)] hover:shadow-[0_25px_60px_-15px_rgba(30,58,138,0.16)]"
        }`}
      >
        {/* LEFT COLUMN: COMPLETELY STABLE LOGIN FORM */}
        <div className="lg:col-span-6 p-5 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-between z-10 bg-white dark:bg-slate-900">
          <div>
            {/* 1. Login Heading */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E2A5A] dark:text-white tracking-tight">
              Login
            </h1>

            {/* 2. Welcome Subtitle */}
            <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-6 sm:mt-8 mb-6">
              Welcome to {settings.siteName ? "PharmaBiz" : "PharmaBiz"}
            </h2>

            {/* Approval Notification Banner */}
            {isApprovedParam && !error && (
              <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Application Approved! 🎉</span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Please log in with your registration password. You will be prompted to complete your subscription payment to activate your dashboard.
                </p>
              </div>
            )}

            {/* Payment Success Notification Banner */}
            {isPaymentSuccess && !error && (
              <div className="mb-5 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                  <span>Payment Completed!</span>
                </div>
                <p className="text-[11px] text-sky-600 dark:text-sky-400">
                  Your pharmacy workspace is active. Please log in to enter your dashboard.
                </p>
              </div>
            )}

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
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition"
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
                    className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition font-mono"
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
                    className="text-xs font-semibold text-brand-primary hover:underline transition"
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
                  className="w-full py-3.5 px-6 rounded-2xl bg-brand-primary hover:opacity-90 text-white text-sm font-bold shadow-lg shadow-black/10 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <Shield className="h-3 w-3 text-brand-primary" />
              <span>Quick Login Credentials</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Super Admin", email: "admin@gmail.com", pass: "admin1234" },
                { label: "Pharmacy Owner", email: "uttam23412@gmail.com", pass: "uttam1234" },
                { label: "Branch Manager", email: "akash@gmail.com", pass: "akash1234" },
                { label: "Cashier", email: "reday@gmail.com", pass: "reday1234" },
                { label: "Inventory Manager", email: "alif@gmail.com", pass: "alif1234" },
              ].map((acc) => {
                const isActive = identifier === acc.email;
                return (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => setDemoCredentials(acc.email, acc.pass)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                      isActive
                        ? "bg-brand-primary text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-brand-primary/10 hover:text-brand-primary dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {acc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PHARMACY ILLUSTRATION WITH ORGANIC WAVE SEPARATION */}
        <div className="hidden md:flex lg:col-span-6 bg-[#EDF3FD] dark:bg-slate-800/40 relative items-center justify-center p-6 sm:p-10 overflow-hidden min-h-[320px] lg:min-h-full">
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

          {/* Main Illustration: login-right.jpg with gentle floating animation */}
          <div className="relative w-full max-w-md flex items-center justify-center z-0 animate-gentle-float transition-transform duration-700 hover:scale-[1.03]">
            <img
              src="/login-right.jpg"
              alt="PharmaBiz Counter Illustration"
              className="w-full max-h-[460px] object-contain drop-shadow-lg rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
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
              className="w-full py-2.5 rounded-xl bg-brand-primary hover:opacity-90 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#EBF2FC] dark:bg-slate-950 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Loading login portal...</span>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
