import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for pdf-parse ENOENT error in Next.js v15
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
