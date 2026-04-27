'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface WishlistVariant {
  id: string;
  sku: string;
  color?: string;
  storage?: string;
  ram?: string;
  price: string;
  compareAtPrice?: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string; isPrimary: boolean }>;
  };
  inventory?: { quantity: number; reservedQuantity: number };
}

interface WishlistItem {
  id: string;
  variantId: string;
  variant: WishlistVariant;
}

interface Wishlist {
  id: string;
  items: WishlistItem[];
}

export default function WishlistPage() {
  const qc = useQueryClient();

  const { data: wishlist, isLoading } = useQuery<Wishlist>({
    queryKey: ['account-wishlist'],
    queryFn: () => api.get('/account/wishlist'),
  });

  const removeMutation = useMutation({
    mutationFn: (variantId: string) => api.delete(`/account/wishlist/${variantId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-wishlist'] });
      toast.success('Removed from wishlist');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addToCartMutation = useMutation({
    mutationFn: (variantId: string) =>
      api.post('/cart/items', { variantId, quantity: 1 }),
    onSuccess: () => toast.success('Added to cart'),
    onError: (err: Error) => toast.error(err.message),
  });

  const items = wishlist?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">← Account</Link>
        <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
            {items.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-100 pb-[140%]" />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="mt-16 rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <div className="text-5xl">❤️</div>
          <p className="mt-4 font-medium text-gray-900">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-gray-500">Save products you love to buy later.</p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Browse Products
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const v = item.variant;
            const product = v.product;
            const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
            const available = (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0);
            const inStock = available > 0;
            const variantLabel = [v.color, v.storage, v.ram].filter(Boolean).join(' / ');

            return (
              <div key={item.id} className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Image */}
                <Link href={`/products/${product.slug}`} className="relative block aspect-square bg-gray-50">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={product.name}
                      fill
                      className="object-contain p-4 transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-200">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.preventDefault(); removeMutation.mutate(item.variantId); }}
                    disabled={removeMutation.isPending}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                    title="Remove from wishlist"
                  >
                    ✕
                  </button>
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col p-3">
                  <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-brand-500">
                    {product.name}
                  </Link>
                  {variantLabel && (
                    <p className="mt-0.5 text-xs text-gray-400">{variantLabel}</p>
                  )}
                  <div className="mt-auto pt-3">
                    <p className="font-bold text-gray-900">{formatPrice(v.price)}</p>
                    {!inStock && (
                      <p className="mt-0.5 text-xs font-medium text-red-500">Out of stock</p>
                    )}
                    <button
                      onClick={() => addToCartMutation.mutate(item.variantId)}
                      disabled={!inStock || addToCartMutation.isPending}
                      className="btn-primary mt-2 w-full py-1.5 text-xs disabled:opacity-40"
                    >
                      {inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
