'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FilterOption { name: string; slug: string; count?: number; }

interface Props {
  categories: FilterOption[];
  brands: FilterOption[];
  facetConditions: Array<{ value: string; count: number }>;
  currentParams: {
    q: string;
    category: string;
    brand: string;
    minPrice: string;
    maxPrice: string;
    condition: string;
    inStockOnly: boolean;
    sort: string;
  };
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  REFURBISHED: 'Refurbished',
  OPEN_BOX: 'Open Box',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export function SearchFilters({ categories, brands, facetConditions, currentParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(currentParams.minPrice);
  const [maxPrice, setMaxPrice] = useState(currentParams.maxPrice);
  const [mobileOpen, setMobileOpen] = useState(false);

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Always reset to page 1 on filter change
      params.delete('page');
      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams],
  );

  function toggle(key: string, value: string) {
    const current = searchParams.get(key);
    router.push(buildUrl({ [key]: current === value ? undefined : value }));
  }

  function applyPrice() {
    router.push(buildUrl({ minPrice: minPrice || undefined, maxPrice: maxPrice || undefined }));
  }

  function clearAll() {
    router.push(`${pathname}?${currentParams.q ? `q=${encodeURIComponent(currentParams.q)}` : ''}`);
  }

  const hasActiveFilters =
    currentParams.category ||
    currentParams.brand ||
    currentParams.minPrice ||
    currentParams.maxPrice ||
    currentParams.condition ||
    currentParams.inStockOnly;

  const filterContent = (
    <div className="space-y-6">
      {/* Sort (mobile only — desktop has its own) */}
      <div className="lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sort By</p>
        <select
          value={currentParams.sort}
          onChange={(e) => router.push(buildUrl({ sort: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button onClick={clearAll} className="text-xs font-medium text-red-500 hover:text-red-700">
          ✕ Clear all filters
        </button>
      )}

      {/* In-stock toggle */}
      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <div
            onClick={() => router.push(buildUrl({ inStockOnly: currentParams.inStockOnly ? undefined : 'true' }))}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              currentParams.inStockOnly ? 'bg-brand-500' : 'bg-gray-200',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                currentParams.inStockOnly ? 'translate-x-4' : 'translate-x-0.5',
              )}
            />
          </div>
          <span className="font-medium text-gray-700">In stock only</span>
        </label>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => toggle('category', cat.slug)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  currentParams.category === cat.slug
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <span>{cat.name}</span>
                {cat.count !== undefined && (
                  <span className={cn('text-xs', currentParams.category === cat.slug ? 'text-blue-100' : 'text-gray-400')}>
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand */}
      {brands.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Brand</p>
          <div className="space-y-1.5">
            {brands.map((brand) => (
              <button
                key={brand.slug}
                onClick={() => toggle('brand', brand.slug)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  currentParams.brand === brand.slug
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <span>{brand.name}</span>
                {brand.count !== undefined && (
                  <span className={cn('text-xs', currentParams.brand === brand.slug ? 'text-blue-100' : 'text-gray-400')}>
                    {brand.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Condition */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Condition</p>
        <div className="space-y-1.5">
          {(['NEW', 'REFURBISHED', 'OPEN_BOX'] as const).map((c) => {
            const count = facetConditions.find((f) => f.value === c)?.count;
            return (
              <button
                key={c}
                onClick={() => toggle('condition', c)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  currentParams.condition === c
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <span>{CONDITION_LABELS[c]}</span>
                {count !== undefined && (
                  <span className={cn('text-xs', currentParams.condition === c ? 'text-blue-100' : 'text-gray-400')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Price (₦)</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={applyPrice}
          className="mt-2 w-full rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          Apply Price
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 lg:hidden"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
            !
          </span>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto h-full w-80 overflow-y-auto bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Filters</span>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-52 flex-shrink-0 lg:block">
        {filterContent}
      </aside>
    </>
  );
}
