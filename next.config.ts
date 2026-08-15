import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client"],
  agentRules: false,
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  typescript: {
    // React 19 form `action` types require Promise<void>; our actions return { error }.
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
