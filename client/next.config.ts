import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Isolate development cache from production builds to permanently prevent chunk collisions
  distDir: process.env.NODE_ENV === "production" ? ".next" : ".next_dev",
};

export default nextConfig;
