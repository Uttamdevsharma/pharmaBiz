"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "pharmabiz-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Apply theme to DOM
  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
      const initialTheme: Theme = savedTheme && ["light", "dark", "system"].includes(savedTheme)
        ? savedTheme
        : "light";
      
      setThemeState(initialTheme);
      const initialResolved = initialTheme === "system" ? getSystemTheme() : initialTheme;
      setResolvedTheme(initialResolved);
      applyTheme(initialResolved);
    } catch (e) {
      console.warn("Could not read theme from localStorage", e);
    }
  }, [applyTheme]);

  // Handle system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (theme === "system") {
        const newResolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemChange);
      return () => mediaQuery.removeEventListener("change", handleSystemChange);
    } else {
      // Legacy fallback
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, [theme, applyTheme]);

  // Set theme handler
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch (e) {
        console.warn("Could not write theme to localStorage", e);
      }

      const newResolved = newTheme === "system" ? getSystemTheme() : newTheme;
      setResolvedTheme(newResolved);
      applyTheme(newResolved);
    },
    [applyTheme]
  );

  // Toggle theme between light and dark
  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // Keyboard shortcut: Alt+T to toggle theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme: mounted ? resolvedTheme : "light",
        setTheme,
        toggleTheme,
        isDark: mounted ? resolvedTheme === "dark" : false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
