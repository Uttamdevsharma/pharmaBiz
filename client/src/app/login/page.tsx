"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Pill, Lock, Mail, AlertCircle, ArrowLeft, Loader2, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { settings } = useSettings();

  const [identifier, setIdentifier] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        if (userObj?.role === "SUPER_ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full brand-glow -z-10 opacity-30 blur-3xl" />

      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-primary mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Public Website
        </Link>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xl p-8 backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-brand-primary text-white mx-auto flex items-center justify-center shadow-md">
              <Pill className="h-6 w-6 transform -rotate-45" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {settings.siteName || "PharmaFlow"} Portal
            </h1>
            <p className="text-xs text-slate-500">Sign in to access your administrative dashboard</p>
          </div>

          {/* Seeded Admin Hint Card */}
          <div className="p-3.5 rounded-xl brand-subtle-bg border brand-subtle-border flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
            <Shield className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-brand-primary">Seeded Super Admin Credentials:</span>
              <div className="font-mono text-[11px] mt-0.5 text-slate-600 dark:text-slate-400">
                Email: <strong>admin@gmail.com</strong> | Password: <strong>admin1234</strong>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-bold shadow hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In to Platform"
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/#pricing"
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                Register a new pharmacy chain →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
