/** @type {import('next').NextConfig} */
const IS_PROD = process.env.NODE_ENV === 'production';

const nextConfig = {
  eslint: {
    // Still surface ESLint errors in CI — set DISABLE_ESLINT=1 only as last resort
    ignoreDuringBuilds: process.env.DISABLE_ESLINT === '1',
  },
  images: {
    // Only disable optimization locally (faster dev). In production Next.js optimizes images.
    unoptimized: !IS_PROD,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
