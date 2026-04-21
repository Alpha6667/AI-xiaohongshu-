import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: [".monkeycode-ai.online"],
    typedRoutes: true,
  },
};

export default nextConfig;
