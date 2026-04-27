'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@jotek/types';

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  PACKED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

const CANCELLABLE = new Set(['PENDING_PAYMENT', 'PROCESSING']);
const RETURN_WINDOW_DAYS = 7;
const RETURN_TAG = '[RETURN REQUESTED]';

function isReturnable(order: Order): boolean {
  if (order.status !== 'DELIVERED') return false;
  if ((order as any).adminNotes?.includes(RETURN_TAG)) return false;
  const deliveredAt = new Date(order.updatedAt).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Date.now() - deliveredAt <= RETURN_WINDOW_DAYS * msPerDay;
}

export default function AccountOrdersPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Order[]; meta: { total: number } }>({
    queryKey: ['account-orders'],
    queryFn: () => api.get('/orders?limit=50'),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderNumber: string) => api.post(`/orders/${orderNumber}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-orders'] });
      toast.success('Order cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Which order's return-request form is currently open
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const returnMutation = useMutation({
    mutationFn: (orderNumber: string) =>
      api.post(`/orders/${orderNumber}/return-request`, { reason: returnReason.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-orders'] });
      toast.success('Return request submitted. Our team will be in touch.');
      setReturnFor(null);
      setReturnReason('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const orders = data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">
          ← Account
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        {orders.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
            {orders.length}
          </span>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <div className="text-4xl">📦</div>
            <p className="mt-3 font-medium text-gray-900">No orders yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Start shopping to see your orders here.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-flex">
              Shop Now
            </Link>
          </div>
        )}

        {orders.map((order) => (
          <div
            key={order.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                <p className="text-sm text-gray-400">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
                <span className="font-semibold text-gray-900">{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50">
              {order.items?.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-2.5 text-sm"
                >
                  <span className="text-gray-700">{item.productName}</span>
                  <span className="text-gray-400">× {item.quantity}</span>
                </div>
              ))}
              {(order.items?.length ?? 0) > 3 && (
                <p className="px-5 py-2 text-xs text-gray-400">
                  +{order.items!.length - 3} more item
                  {order.items!.length - 3 > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Tracking info */}
            {order.shipment?.trackingNumber && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-xs text-gray-500">
                Tracking:{' '}
                <span className="font-mono font-medium text-gray-700">
                  {order.shipment.trackingNumber}
                </span>
                {order.shipment.trackingUrl && (
                  <>
                    {' · '}
                    <a
                      href={order.shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 hover:underline"
                    >
                      Track Package →
                    </a>
                  </>
                )}
              </div>
            )}

            {/* Return request banner */}
            {(order as any).adminNotes?.includes(RETURN_TAG) && (
              <div className="border-t border-gray-100 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
                Return requested — our team will contact you.
              </div>
            )}

            {/* Inline return request form */}
            {returnFor === order.orderNumber && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                <p className="mb-2 text-sm font-medium text-gray-900">
                  Why are you returning this order?
                </p>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us what went wrong (min 10 characters)"
                  className="input resize-none text-sm"
                  maxLength={500}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => returnMutation.mutate(order.orderNumber)}
                    disabled={returnMutation.isPending || returnReason.trim().length < 10}
                    className="btn-primary py-1.5 text-xs disabled:opacity-50"
                  >
                    {returnMutation.isPending ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <button
                    onClick={() => {
                      setReturnFor(null);
                      setReturnReason('');
                    }}
                    className="btn-secondary py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3">
              <Link
                href={`/order-confirmation/${order.orderNumber}`}
                className="btn-secondary py-1.5 text-xs"
              >
                View Details
              </Link>
              {['SHIPPED', 'PROCESSING', 'PACKED'].includes(order.status) && (
                <Link
                  href={`/track?order=${order.orderNumber}`}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Track Order
                </Link>
              )}
              {isReturnable(order) && returnFor !== order.orderNumber && (
                <button
                  onClick={() => {
                    setReturnFor(order.orderNumber);
                    setReturnReason('');
                  }}
                  className="ml-auto rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Request Return
                </button>
              )}
              {CANCELLABLE.has(order.status) && (
                <button
                  onClick={() => {
                    if (confirm('Cancel this order?'))
                      cancelMutation.mutate(order.orderNumber);
                  }}
                  disabled={cancelMutation.isPending}
                  className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
