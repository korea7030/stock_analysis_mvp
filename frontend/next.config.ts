import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  experimental: {
    agentUpgrade: "security",
  },
  images: {
    unoptimized: true,
  },
} satisfies NextConfig;

export default nextConfig;
