import type { Metadata } from "next";
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Providers } from "./providers";
import type { SiteSettings } from "@/context/SettingsContext";
import { hexToRgb } from "@/lib/colorUtils";

export const metadata: Metadata = {
  title: "PharmaBiz - Multi-Tenant Pharmacy Management SaaS",
  description: "Next-gen offline-first pharmacy management platform for single and multi-branch pharmacy chains.",
};

async function getInitialSettings(): Promise<SiteSettings | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${apiUrl}/settings/public`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSettings = await getInitialSettings();
  const initialColor = initialSettings?.primaryColor || null;
  const initialRgb = initialColor ? hexToRgb(initialColor) : null;
  const brandColor = initialColor || "#10b981";

  return (
    <html
      lang="en"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {initialColor && initialRgb ? (
          <style
            id="brand-primary-vars"
            dangerouslySetInnerHTML={{
              __html: `:root { --primary-color: ${initialColor}; --primary-rgb: ${initialRgb}; }`,
            }}
          />
        ) : null}
        <Script
          id="theme-and-brand-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('pharmabiz-theme');
                  var isDark = stored === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}

                try {
                  var cached = localStorage.getItem('pharmabiz_site_settings');
                  if (cached) {
                    var parsed = JSON.parse(cached);
                    if (parsed && parsed.primaryColor) {
                      var clean = parsed.primaryColor.replace('#', '');
                      var r = 5, g = 150, b = 105;
                      if (clean.length === 6) {
                        r = parseInt(clean.substring(0, 2), 16);
                        g = parseInt(clean.substring(2, 4), 16);
                        b = parseInt(clean.substring(4, 6), 16);
                      } else if (clean.length === 3) {
                        r = parseInt(clean[0] + clean[0], 16);
                        g = parseInt(clean[1] + clean[1], 16);
                        b = parseInt(clean[2] + clean[2], 16);
                      }
                      document.documentElement.style.setProperty('--primary-color', parsed.primaryColor);
                      document.documentElement.style.setProperty('--primary-rgb', r + ', ' + g + ', ' + b);
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <NextTopLoader
          color={brandColor}
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow={`0 0 10px ${brandColor},0 0 5px ${brandColor}`}
          zIndex={999999}
        />
        <Providers initialSettings={initialSettings}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
