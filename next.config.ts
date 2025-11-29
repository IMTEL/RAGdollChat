import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    optimizeCss: false,   // <-- required fix for LightningCSS missing MUSL binary
  },
};

export default nextConfig;
