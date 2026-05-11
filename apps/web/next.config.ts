import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack rooted at the monorepo package-lock location.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
