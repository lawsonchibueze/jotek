'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  primaryImage: string | null;
  minPrice: string;
}

interface SearchResponse {
  products: Suggestion[];
  meta: { total: number };
}

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search — 200ms of no typing before firing
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ q: query.trim(), limit: '6', sort: 'newest' });
        const res = await api.get<SearchResponse>(`/search?${qs}`);
        setResults(res.products);
        setTotal(res.meta.total);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      router.push(`/products/${results[activeIndex].slug}`);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <form onSubmit={onSubmit} className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          type="search"
          placeholder="Search phones, laptops, accessories..."
          className="input pr-12"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading && (
            <div className="py-6 text-center text-sm text-gray-400">Searching…</div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">
              No matches for "{query.trim()}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <ul className="divide-y divide-gray-50">
                {results.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/products/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                        i === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                        {p.primaryImage && (
                          <Image
                            src={p.primaryImage}
                            alt=""
                            fill
                            className="object-contain p-1"
                            sizes="40px"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{formatPrice(p.minPrice)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {total > results.length && (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
                  className="block border-t border-gray-100 bg-gray-50 py-2.5 text-center text-sm font-medium text-brand-500 hover:bg-gray-100"
                >
                  See all {total} results →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
