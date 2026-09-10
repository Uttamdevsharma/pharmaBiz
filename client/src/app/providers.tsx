"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { BranchProvider } from "@/context/BranchContext";
import { SettingsProvider } from "@/context/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BranchProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </BranchProvider>
    </AuthProvider>
  );
}
