import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles everything into .next/standalone/ so the Docker
  // image only needs to copy that directory — no node_modules in the image.
  output: "standalone",
  // Let phones on the local network load the development client. Without this,
  // the native camera picker still opens, but Next.js blocks dev resources and
  // the React change handler may never show the crop step.
  allowedDevOrigins: ["192.168.1.27"],
};

export default nextConfig;
