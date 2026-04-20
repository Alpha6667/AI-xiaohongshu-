import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedHosts: [".monkeycode-ai.online"],
    typedRoutes: true,
  },
};

export default nextConfig;
