import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
};

// A build must not overwrite the manifests/chunks of a running development server.
export default function config(phase: string): NextConfig {
  return { ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next' };
}
