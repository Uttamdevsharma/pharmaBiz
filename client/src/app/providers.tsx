"use client";

import React from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { BranchProvider } from "@/context/BranchContext";
import { SettingsProvider, SiteSettings } from "@/context/SettingsContext";
import { ToastProvider } from "@/context/ToastContext";

export function Providers({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: SiteSettings | null;
}) {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BranchProvider>
            <SettingsProvider initialSettings={initialSettings}>
              {children}
            </SettingsProvider>
          </BranchProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
