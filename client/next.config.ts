import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Isolate development cache from production builds to permanently prevent chunk collisions
  distDir: process.env.NODE_ENV === "production" ? ".next" : ".next_dev",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.SERVER_URL || "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

