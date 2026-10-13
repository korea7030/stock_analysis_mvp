import path from "node:path";
import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
} satisfies NextConfig;

export default nextConfig;
