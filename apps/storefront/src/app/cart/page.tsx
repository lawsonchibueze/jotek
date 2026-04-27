'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Cart } from '@jotek/types';
import Link from 'next/link';
import Image from 'next/image';
import { CreditCard, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { CouponInput } from '@/components/shop/coupon-input';

export default function CartPage() {
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: () => api.get<Cart>('/cart'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch<Cart>(`/cart/items/${itemId}`, { quantity }),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.delete<Cart>(`/cart/items/${itemId}`),
    onSuccess: (data) => queryClient.setQueryData(['cart'], data),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">
        Loading cart...
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-gray-300" />
        <h1 className="mt-4 text-2xl font-black text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Add phones, laptops, accessories or audio gear to get started.</p>
        <Link href="/search" className="btn-primary mt-6 inline-flex">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-500">Secure checkout</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900">Shopping Cart ({cart.itemCount} items)</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Authentic stock
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <CreditCard className="h-3.5 w-3.5 text-brand-500" />
            Paystack secure
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                {item.product.primaryImage ? (
                  <Image src={item.product.primaryImage} alt={item.product.name} fill className="object-contain p-2" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${item.product.slug}`} className="line-clamp-2 font-semibold text-gray-900 hover:text-brand-500">
                      {item.product.name}
                    </Link>
                    {(item.variant.color || item.variant.storage || item.variant.ram) && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {[item.variant.color, item.variant.storage, item.variant.ram].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(item.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200">
                    <button
                      onClick={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                      className="p-2 hover:bg-gray-50"
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                      className="p-2 hover:bg-gray-50"
                      disabled={item.quantity >= item.variant.availableQuantity}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-black text-gray-900">
                    {formatPrice(parseFloat(item.variant.price) * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-black text-gray-900">Order Summary</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            {cart.coupon && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({cart.coupon.code})</span>
                <span>-{formatPrice(cart.coupon.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-black">
              <span>Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
          </div>

          <div className="mt-5">
            <CouponInput appliedCoupon={cart.coupon ?? null} />
          </div>

          <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">
            <Truck className="mr-1 inline h-3.5 w-3.5" />
            Delivery fee is calculated from your Nigerian state at checkout.
          </div>

          <Link href="/checkout" className="btn-primary mt-6 w-full">
            Proceed to Checkout
          </Link>

          <Link href="/search" className="btn-ghost mt-3 w-full text-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
