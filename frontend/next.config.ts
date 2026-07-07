import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
} satisfies NextConfig;

export default nextConfig;
