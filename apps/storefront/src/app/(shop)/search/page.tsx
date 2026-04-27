import type { Metadata } from 'next';
import { serverFetch } from '@/lib/api';
import { fallbackBrands, fallbackCategories } from '@/lib/catalog-fallbacks';
import { ProductCard } from '@/components/shop/product-card';
import { SearchFilters } from '@/components/shop/search-filters';
import { SearchSortSelect } from '@/components/shop/search-sort-select';
import type { ProductCard as ProductCardType } from '@jotek/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SearchResult {
  products: ProductCardType[];
  facets: {
    categories: Array<{ value: string; count: number }>;
    brands: Array<{ value: string; count: number }>;
    conditions: Array<{ value: string; count: number }>;
  };
  meta: { total: number; page: number; limit: number; totalPages: number; query: string | null };
}

interface RawCategory { id: string; name: string; slug: string; children?: RawCategory[]; }
interface RawBrand { id: string; name: string; slug: string; }

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = sp.q || '';
  return {
    title: q ? `"${q}" — Jotek` : 'Browse Products — Jotek',
    description: q
      ? `Shop results for "${q}" at Jotek. Authentic products, nationwide delivery.`
      : 'Browse all electronics at Jotek. Phones, laptops, TVs, audio and more.',
  };
}

function flattenCategories(cats: RawCategory[]): Array<{ name: string; slug: string }> {
  return cats.flatMap((c) => [
    { name: c.name, slug: c.slug },
    ...(c.children ? flattenCategories(c.children) : []),
  ]);
}

function removeFromParams(sp: Record<string, string | undefined>, ...keys: string[]): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && !keys.includes(k) && k !== 'page') p.set(k, v);
  }
  return `/search?${p.toString()}`;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const q = sp.q || '';
  const category = sp.category || '';
  const brand = sp.brand || '';
  const minPrice = sp.minPrice || '';
  const maxPrice = sp.maxPrice || '';
  const condition = sp.condition || '';
  const inStockOnly = sp.inStockOnly === 'true';
  const onSaleOnly = sp.onSale === 'true';
  const sort = sp.sort || 'newest';
  const page = Number(sp.page) || 1;

  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (category) qs.set('categorySlug', category);
  if (brand) qs.set('brandSlug', brand);
  if (minPrice) qs.set('minPrice', minPrice);
  if (maxPrice) qs.set('maxPrice', maxPrice);
  if (condition) qs.set('condition', condition);
  if (inStockOnly) qs.set('inStockOnly', 'true');
  if (onSaleOnly) qs.set('onSaleOnly', 'true');
  qs.set('sort', sort);
  qs.set('page', String(page));
  qs.set('limit', '24');

  const [results, rawCategories, rawBrands] = await Promise.all([
    serverFetch<SearchResult>(`/search?${qs}`, 0).catch(
      (): SearchResult => ({
        products: [],
        facets: { categories: [], brands: [], conditions: [] },
        meta: { total: 0, page: 1, limit: 24, totalPages: 0, query: null },
      }),
    ),
    serverFetch<RawCategory[]>('/categories', 300).catch(() => [] as RawCategory[]),
    serverFetch<RawBrand[]>('/brands', 300).catch(() => [] as RawBrand[]),
  ]);

  const allCategories = flattenCategories(
    rawCategories.length > 0 ? rawCategories : fallbackCategories,
  );
  const catCountMap = new Map(results.facets.categories.map((f) => [f.value, f.count]));
  const brandCountMap = new Map(results.facets.brands.map((f) => [f.value, f.count]));

  const categoryOptions = allCategories.map((c) => ({
    name: c.name,
    slug: c.slug,
    count: catCountMap.get(c.name),
  }));

  const visibleBrands = rawBrands.length > 0 ? rawBrands : fallbackBrands;

  const brandOptions = visibleBrands.slice(0, 30).map((b) => ({
    name: b.name,
    slug: b.slug,
    count: brandCountMap.get(b.name),
  }));

  const currentParams = { q, category, brand, minPrice, maxPrice, condition, inStockOnly, sort };

  // Active filter chips
  const chips: Array<{ label: string; href: string }> = [];
  if (category) {
    chips.push({
      label: allCategories.find((c) => c.slug === category)?.name ?? category,
      href: removeFromParams(sp, 'category'),
    });
  }
  if (brand) {
    chips.push({
      label: visibleBrands.find((b) => b.slug === brand)?.name ?? brand,
      href: removeFromParams(sp, 'brand'),
    });
  }
  if (condition) {
    const labels: Record<string, string> = { NEW: 'New', REFURBISHED: 'Refurbished', OPEN_BOX: 'Open Box' };
    chips.push({ label: labels[condition] ?? condition, href: removeFromParams(sp, 'condition') });
  }
  if (minPrice || maxPrice) {
    chips.push({
      label: `₦${minPrice || '0'} – ₦${maxPrice || '∞'}`,
      href: removeFromParams(sp, 'minPrice', 'maxPrice'),
    });
  }
  if (inStockOnly) {
    chips.push({ label: 'In Stock Only', href: removeFromParams(sp, 'inStockOnly') });
  }
  if (onSaleOnly) {
    chips.push({ label: 'On Sale', href: removeFromParams(sp, 'onSale') });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        {q ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Results for{' '}
              <span className="text-brand-500">"{q}"</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {results.meta.total} product{results.meta.total !== 1 ? 's' : ''} found
            </p>
          </>
        ) : onSaleOnly ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Today's Deals</h1>
            <p className="mt-1 text-sm text-gray-500">
              {results.meta.total} product{results.meta.total !== 1 ? 's' : ''} on sale
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Browse Products</h1>
            <p className="mt-1 text-sm text-gray-500">{results.meta.total} products</p>
          </>
        )}
      </div>

      <div className="flex gap-8">
        {/* Filter sidebar */}
        <SearchFilters
          categories={categoryOptions}
          brands={brandOptions}
          facetConditions={results.facets.conditions}
          currentParams={currentParams}
        />

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Sort bar + active chips */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Active chips */}
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.href}
                  href={chip.href}
                  className="flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-500 hover:bg-brand-500/20"
                >
                  {chip.label}
                  <span className="text-brand-400">✕</span>
                </Link>
              ))}
            </div>

            {/* Sort (desktop) */}
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-sm text-gray-500">Sort:</span>
              <SearchSortSelect currentSort={sort} options={SORT_OPTIONS} />
            </div>
          </div>

          {/* Results */}
          {results.products.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-20 text-center">
              <p className="text-lg font-medium text-gray-900">No products found</p>
              <p className="mt-2 text-sm text-gray-500">
                {q
                  ? 'Try different search terms or clear your filters.'
                  : 'No products match your current filters.'}
              </p>
              {(q || chips.length > 0) && (
                <Link href="/search" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
                  Clear all and browse →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {results.meta.totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2">
              {page > 1 && (
                <PaginationLink sp={sp} page={page - 1} label="←" />
              )}
              {Array.from({ length: results.meta.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === results.meta.totalPages)
                .reduce<Array<number | '…'>>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="flex h-10 w-10 items-center justify-center text-gray-400">
                      …
                    </span>
                  ) : (
                    <PaginationLink key={p} sp={sp} page={p as number} label={String(p)} current={p === page} />
                  ),
                )}
              {page < results.meta.totalPages && (
                <PaginationLink sp={sp} page={page + 1} label="→" />
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PaginationLink({
  sp,
  page,
  label,
  current,
}: {
  sp: Record<string, string | undefined>;
  page: number;
  label: string;
  current?: boolean;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== 'page') params.set(k, v);
  }
  params.set('page', String(page));

  return (
    <Link
      href={`/search?${params.toString()}`}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
        current
          ? 'bg-brand-500 text-white'
          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );
}
