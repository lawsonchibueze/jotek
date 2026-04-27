import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://jotek.ng';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Keep authenticated, checkout, and cart URLs out of the index — they
        // are per-user and surface no content that benefits from crawling.
        disallow: [
          '/account',
          '/account/',
          '/cart',
          '/checkout',
          '/order-confirmation',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
