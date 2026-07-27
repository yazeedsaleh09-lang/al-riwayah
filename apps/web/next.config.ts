import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const realtimeUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";
const realtimeOrigin = new URL(realtimeUrl).origin;
const realtimeSocketOrigin = realtimeOrigin.replace(/^http/, "ws");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Playwright's development compiler cache isolated from the production
  // bundle, whose NEXT_PUBLIC_* values may intentionally target a different host.
  distDir: process.env.E2E_DEV === "1" ? ".next-e2e" : ".next",
  // Workspace packages are shipped as TypeScript source; let Next transpile them.
  transpilePackages: [
    "@al-riwayah/game-engine",
    "@al-riwayah/content",
    "@al-riwayah/protocol",
  ],
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000",
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
      ...(isProduction
        ? [
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self' data:",
                `connect-src 'self' ${realtimeOrigin} ${realtimeSocketOrigin}`,
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
              ].join("; "),
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
          ]
        : []),
    ];
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
