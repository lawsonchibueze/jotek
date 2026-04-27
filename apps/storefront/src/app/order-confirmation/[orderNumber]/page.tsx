import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { authedServerFetch } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@jotek/types';
import { PaymentStatusBanner } from '@/components/shop/payment-status-banner';

export const metadata: Metadata = { title: 'Order Confirmed' };

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderNumber } = await params;
  const order = await authedServerFetch<Order>(`/orders/${orderNumber}`).catch(() => null);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Order not found</h1>
        <Link href="/" className="btn-primary mt-6 inline-flex">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {/* Payment status — client component polls if Paystack just redirected here */}
      <Suspense
        fallback={
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
            <h1 className="mt-5 text-2xl font-bold text-gray-900">Loading…</h1>
          </div>
        }
      >
        <PaymentStatusBanner
          orderNumber={order.orderNumber}
          initialStatus={order.status}
          paymentMethod={order.paymentMethod}
        />
      </Suspense>

      {/* Order items + totals */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Order Details</h2>
          <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
        </div>

        <div className="divide-y divide-gray-100">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-6 py-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">{item.productName}</p>
                {item.variantDescription && (
                  <p className="text-gray-500">{item.variantDescription}</p>
                )}
                <p className="text-gray-400">× {item.quantity}</p>
              </div>
              <span className="font-medium">{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {parseFloat(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>Shipping</span>
            <span>
              {parseFloat(order.shippingFee) === 0 ? 'Free' : formatPrice(order.shippingFee)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {parseFloat(order.taxAmount) > 0 && (
            <p className="pt-1 text-right text-xs text-gray-400">
              Includes {formatPrice(order.taxAmount)} VAT (7.5%)
            </p>
          )}
        </div>
      </div>

      {/* Delivery address */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 text-sm">
        <h3 className="font-semibold text-gray-900">Delivery Address</h3>
        <address className="mt-2 not-italic leading-relaxed text-gray-600">
          {(order.shippingAddress as any)?.firstName} {(order.shippingAddress as any)?.lastName}
          <br />
          {(order.shippingAddress as any)?.line1}
          {(order.shippingAddress as any)?.line2 && (
            <>, {(order.shippingAddress as any).line2}</>
          )}
          <br />
          {(order.shippingAddress as any)?.city}, {(order.shippingAddress as any)?.state}
        </address>
        {(order.shippingAddress as any)?.phone && (
          <p className="mt-1 text-gray-500">{(order.shippingAddress as any).phone}</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/track?order=${order.orderNumber}`}
          className="btn-primary flex-1 text-center"
        >
          Track Order
        </Link>
        <Link
          href={`/invoice/${order.orderNumber}`}
          target="_blank"
          className="btn-secondary flex-1 text-center"
        >
          Download Invoice
        </Link>
        <Link href="/account/orders" className="btn-secondary flex-1 text-center">
          View All Orders
        </Link>
      </div>
    </div>
  );
}
