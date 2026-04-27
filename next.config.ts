import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.optimization.usedExports = false;
    return config;
  },
};

export default nextConfig;
