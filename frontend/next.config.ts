import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable gzip/brotli compression
  compress: true,
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Optimize package imports - only import what's used
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'date-fns', 'sonner'],
  },
  // Reduce powered-by header
  poweredByHeader: false,
};

export default nextConfig;
