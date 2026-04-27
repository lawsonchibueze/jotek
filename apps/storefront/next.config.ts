import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'media.jotek.ng',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'loctech-sms.r2.cloudflarestorage.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Improve performance for Nigerian networks
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      // Proxy analytics scripts (reduces ad-blocker impact)
      {
        source: '/analytics/ga',
        destination: 'https://www.googletagmanager.com/gtag/js',
      },
    ];
  },
};

export default nextConfig;
