'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import type { Product } from '@jotek/types';

interface Props {
  product: Product;
  defaultVariantId: string;
}

interface WishlistResponse {
  id: string;
  items: Array<{ variantId: string }>;
}

export function ProductActions({ product, defaultVariantId }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const loggedIn = !!session?.user;

  const defaultVariant = product.variants.find((v) => v.id === defaultVariantId) ?? product.variants[0];

  const [selectedColor, setSelectedColor] = useState<string | null>(defaultVariant?.color ?? null);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(defaultVariant?.storage ?? null);

  const hasColors = product.variants.some((v) => v.color);
  const hasStorage = product.variants.some((v) => v.storage);

  const uniqueColors = hasColors
    ? [...new Map(product.variants.filter((v) => v.color).map((v) => [v.color, v])).values()]
    : [];
  const uniqueStorages = hasStorage
    ? [...new Map(product.variants.filter((v) => v.storage).map((v) => [v.storage, v])).values()]
    : [];

  const selectedVariant = product.variants.find((v) => {
    const colorMatch = !hasColors || v.color === selectedColor;
    const storageMatch = !hasStorage || v.storage === selectedStorage;
    return colorMatch && storageMatch;
  }) ?? defaultVariant;

  const availableQty = selectedVariant?.inventory?.availableQuantity ?? 0;
  const inStock = availableQty > 0;

  const addToCartMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/items', { variantId: selectedVariant?.id, quantity: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Added to cart');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: wishlist } = useQuery<WishlistResponse>({
    queryKey: ['account-wishlist'],
    queryFn: () => api.get('/account/wishlist'),
    enabled: loggedIn,
    staleTime: 30_000,
  });

  const inWishlist =
    !!selectedVariant &&
    !!wishlist?.items.some((i) => i.variantId === selectedVariant.id);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVariant) return;
      if (inWishlist) {
        await api.delete(`/account/wishlist/${selectedVariant.id}`);
      } else {
        await api.post('/account/wishlist', { variantId: selectedVariant.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-wishlist'] });
      toast.success(inWishlist ? 'Removed from wishlist' : 'Saved to wishlist');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleWishlistClick() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=/products/${product.slug}`);
      return;
    }
    wishlistMutation.mutate();
  }

  async function handleBuyNow() {
    try {
      await addToCartMutation.mutateAsync();
      router.push('/checkout');
    } catch {
      // error already toasted
    }
  }

  const isPending = addToCartMutation.isPending;

  return (
    <div>
      {/* Price */}
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900">
          {formatPrice(selectedVariant?.price ?? '0')}
        </span>
        {selectedVariant?.compareAtPrice && (
          <span className="text-lg text-gray-400 line-through">
            {formatPrice(selectedVariant.compareAtPrice)}
          </span>
        )}
        {selectedVariant?.compareAtPrice && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            {Math.round(
              ((parseFloat(selectedVariant.compareAtPrice) - parseFloat(selectedVariant.price)) /
                parseFloat(selectedVariant.compareAtPrice)) *
                100,
            )}% OFF
          </span>
        )}
      </div>

      {/* Stock status */}
      <p className={`mt-1 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}>
        {inStock ? (availableQty <= 5 ? `Only ${availableQty} left` : 'In Stock') : 'Out of Stock'}
      </p>

      {/* Variant selectors */}
      {product.variants.length > 1 && (
        <div className="mt-6 space-y-4">
          {hasColors && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Color: <span className="font-semibold">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((v) => (
                  <button
                    key={v.color}
                    onClick={() => setSelectedColor(v.color)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedColor === v.color
                        ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
                        : 'border-gray-300 hover:border-brand-400'
                    }`}
                    style={v.colorHex && selectedColor !== v.color ? { borderColor: v.colorHex } : undefined}
                  >
                    {v.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasStorage && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Storage: <span className="font-semibold">{selectedStorage}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {uniqueStorages.map((v) => (
                  <button
                    key={v.storage}
                    onClick={() => setSelectedStorage(v.storage)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedStorage === v.storage
                        ? 'border-brand-500 bg-brand-50 font-medium text-brand-700'
                        : 'border-gray-300 hover:border-brand-400'
                    }`}
                  >
                    {v.storage}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA buttons */}
      <div className="mt-8 space-y-3">
        <div className="flex gap-2">
          <button
            disabled={!inStock || isPending}
            onClick={() => addToCartMutation.mutate()}
            className="btn-primary flex-1 py-4 text-base disabled:opacity-50"
          >
            {isPending ? 'Adding…' : inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <button
            onClick={handleWishlistClick}
            disabled={wishlistMutation.isPending}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`flex w-14 items-center justify-center rounded-xl border transition-colors ${
              inWishlist
                ? 'border-red-200 bg-red-50 text-red-500'
                : 'border-gray-300 text-gray-400 hover:border-red-200 hover:text-red-400'
            } disabled:opacity-50`}
          >
            <Heart className="h-5 w-5" fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>
        {inStock ? (
          <button
            disabled={!inStock || isPending}
            onClick={handleBuyNow}
            className="btn-secondary w-full py-4 text-base disabled:opacity-50"
          >
            Buy Now
          </button>
        ) : (
          selectedVariant && <NotifyBackInStock variantId={selectedVariant.id} defaultEmail={session?.user?.email} />
        )}
      </div>
    </div>
  );
}

function NotifyBackInStock({ variantId, defaultEmail }: { variantId: string; defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [subscribed, setSubscribed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post('/stock-alerts', { variantId, email: email.trim() }),
    onSuccess: () => {
      setSubscribed(true);
      toast.success("We'll email you when it's back in stock");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (subscribed) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        You're on the list — we'll email {email} the moment it returns.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-2 text-sm font-medium text-gray-700">Get notified when it's back</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input text-sm"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !email.trim()}
          className="btn-secondary whitespace-nowrap disabled:opacity-50"
        >
          {mutation.isPending ? '…' : 'Notify Me'}
        </button>
      </div>
    </div>
  );
}
