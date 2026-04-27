import type { MetadataRoute } from 'next';
import { serverFetch } from '@/lib/api';
import type { Category, Brand, PaginatedResponse, ProductCard } from '@jotek/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://jotek.ng';

// Next.js caps a single sitemap at 50 000 URLs. For now we fetch one large
// page; if the catalogue grows past that, swap to generateSitemaps with shards.
const PRODUCT_LIMIT = 1000;

function flattenCategories(cats: Category[]): Category[] {
  return cats.flatMap((c) => [c, ...flattenCategories(c.children ?? [])]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productsRes, categories, brands] = await Promise.all([
    serverFetch<PaginatedResponse<ProductCard>>(
      `/products?limit=${PRODUCT_LIMIT}&sort=newest`,
      3600,
    ).catch(() => ({ data: [] as ProductCard[], meta: { total: 0, page: 1, limit: PRODUCT_LIMIT, totalPages: 1 } })),
    serverFetch<Category[]>('/categories', 3600).catch(() => [] as Category[]),
    serverFetch<Brand[]>('/brands', 3600).catch(() => [] as Brand[]),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/deals`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/delivery`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/returns`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/warranty`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = flattenCategories(categories)
    .filter((c) => c.isActive)
    .map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    }));

  const brandPages: MetadataRoute.Sitemap = brands
    .filter((b) => b.isActive)
    .map((b) => ({
      url: `${SITE_URL}/brand/${b.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const productPages: MetadataRoute.Sitemap = productsRes.data.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...brandPages, ...productPages];
}
