import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const configuredRealtimeUrl = process.env.NEXT_PUBLIC_SERVER_URL;

if (isProduction && !configuredRealtimeUrl) {
  throw new Error("NEXT_PUBLIC_SERVER_URL is required for production builds");
}

const realtimeUrl = configuredRealtimeUrl ?? "http://localhost:4000";
const parsedRealtimeUrl = new URL(realtimeUrl);

if (
  isProduction &&
  (parsedRealtimeUrl.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "::1"].includes(parsedRealtimeUrl.hostname))
) {
  throw new Error("NEXT_PUBLIC_SERVER_URL must be a public HTTPS origin in production");
}

const realtimeOrigin = new URL(realtimeUrl).origin;
const realtimeSocketOrigin = realtimeOrigin.replace(/^http/, "ws");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Automated design evidence must represent the product surface, not the
  // framework's floating development badge.
  devIndicators: false,
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
    NEXT_PUBLIC_SERVER_URL: realtimeUrl,
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
