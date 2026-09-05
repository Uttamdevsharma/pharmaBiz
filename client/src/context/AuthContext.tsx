"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export type UserRole =
  | "SUPER_ADMIN"
  | "CTO"
  | "PROJECT_MANAGER"
  | "COMPANY_OWNER"
  | "BRANCH_MANAGER"
  | "INVENTORY_EXECUTIVE"
  | "CASHIER"
  | "ACCOUNTS"
  | "REGIONAL_ADMIN"
  | "AUDITOR"
  | string;

export interface User {
  id: string;
  tenantId: string;
  branchId: string | null;
  role: UserRole;
  customRoleId?: string | null;
  customRoleName?: string | null;
  pharmacyRoleId?: string | null;
  pharmacyRoleName?: string | null;
  permissions?: string[];
  name?: string;
  username?: string;
  email?: string;
  verificationStatus?: string | null;
  requiresOtp?: boolean;
  paymentRequired?: boolean;
}

/**
 * Returns the proper dashboard URL for a user based on their role and tenant context
 */
export function getRedirectUrlForUser(user: User | null): string {
  if (!user) return "/login";

  // 1. Super Admin & Platform Staff (CTO, Project Manager, Platform Delegates)
  if (
    user.role === "SUPER_ADMIN" ||
    user.role === "CTO" ||
    user.role === "PROJECT_MANAGER" ||
    (Boolean(user.customRoleId) && !user.pharmacyRoleId && user.role !== "COMPANY_OWNER")
  ) {
    return "/admin";
  }

  // 2. Unverified or Pending Pharmacy Owners -> Redirect to Verification Status
  if (user.role === "COMPANY_OWNER" && user.verificationStatus && user.verificationStatus !== "ACTIVE") {
    return `/verification-status?tenantId=${user.tenantId}&email=${encodeURIComponent(user.email || "")}`;
  }

  // 3. Pharmacy Owner, Pharmacy Staff (Cashier, Branch Manager, Inventory, Accounts, Custom Roles)
  return "/dashboard";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isPlatformStaff: boolean;
  isPharmacyOwner: boolean;
  isPharmacyStaff: boolean;
  hasPermission: (permissionKey: string) => boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string; redirectUrl?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  isSuperAdmin: false,
  isPlatformStaff: false,
  isPharmacyOwner: false,
  isPharmacyStaff: false,
  hasPermission: () => false,
  login: async () => ({ success: false }),
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return;
      const res = await fetchApi<User>("/auth/me");
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      }
    } catch (e) {
      console.warn("Could not refresh user session", e);
    }
  };

  useEffect(() => {
    // Rehydrate auth from localStorage
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Silently refresh permissions in background
        fetchApi<User>("/auth/me").then((res) => {
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem("user", JSON.stringify(res.data));
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Failed to rehydrate auth state", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetchApi<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: identifier,
          email: identifier,
          password,
        }),
      });

      if (res.success && res.data) {
        const { token: jwtToken, user: authUser } = res.data;
        setToken(jwtToken);
        setUser(authUser);

        localStorage.setItem("token", jwtToken);
        localStorage.setItem("user", JSON.stringify(authUser));

        const targetUrl = getRedirectUrlForUser(authUser);

        return { success: true, redirectUrl: targetUrl };
      }

      return {
        success: false,
        message: res.message || "Invalid username or password",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Login failed. Please check your credentials.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Explicit Platform Super Admin vs Pharmacy Role Detection
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  
  const isPlatformStaff =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "CTO" ||
    user?.role === "PROJECT_MANAGER" ||
    (Boolean(user?.customRoleId) && !user?.pharmacyRoleId && user?.role !== "COMPANY_OWNER");

  const isPharmacyOwner = user?.role === "COMPANY_OWNER";

  const isPharmacyStaff =
    user?.role === "COMPANY_OWNER" ||
    Boolean(user?.pharmacyRoleId) ||
    [
      "BRANCH_MANAGER",
      "MANAGER",
      "INVENTORY_EXECUTIVE",
      "CASHIER",
      "ACCOUNTS",
      "REGIONAL_ADMIN",
      "AUDITOR",
    ].includes(user?.role || "");

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    // Super Admin & Pharmacy Owner have full authority within their respective scopes
    if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_OWNER") return true;
    const perms = user.permissions || [];
    if (perms.includes("*")) return true;
    return perms.includes(permissionKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isSuperAdmin,
        isPlatformStaff,
        isPharmacyOwner,
        isPharmacyStaff,
        hasPermission,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
