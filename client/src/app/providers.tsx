"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { BranchProvider } from "@/context/BranchContext";
import { SettingsProvider } from "@/context/SettingsContext";

import { ToastProvider } from "@/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <BranchProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </BranchProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
