import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/**/*': ['./prisma/schema.prisma'],
  },
  // Handle environment-specific font loading
  env: {
    NEXT_FONT_GOOGLE_DISPLAY: 'swap',
  },
  // Disable ESLint during builds for Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
