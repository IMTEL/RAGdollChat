import type { NextConfig } from 'next';

const basePath =
  process.env.NODE_ENV === 'development'
    ? ''
    : process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  basePath,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
} satisfies NextConfig;

export default nextConfig;
