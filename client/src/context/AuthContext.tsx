"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  tenantId: string;
  branchId: string | null;
  role: "SUPER_ADMIN" | "COMPANY_OWNER" | "REGIONAL_ADMIN" | "BRANCH_MANAGER" | "CASHIER" | "AUDITOR";
  name?: string;
  username?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  isSuperAdmin: false,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Rehydrate auth from localStorage
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
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

        return { success: true };
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isSuperAdmin: user?.role === "SUPER_ADMIN",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
