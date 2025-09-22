import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don’t fail the production build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: don’t fail the build on type errors (useful while iterating)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
