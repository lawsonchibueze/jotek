import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, CreditCard, MessageCircle, PackageCheck, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { OrderActions } from '@/components/orders/order-actions';
import type { Order } from '@jotek/types';

export const metadata: Metadata = { title: 'Order Detail' };
export const dynamic = 'force-dynamic';

type OrderStatus = Order['status'];

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING_PAYMENT', label: 'Pending' },
  { status: 'PAID', label: 'Paid' },
  { status: 'PROCESSING', label: 'Processing' },
  { status: 'PACKED', label: 'Packed' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'DELIVERED', label: 'Delivered' },
];

const CANCELLED_STATUSES = new Set(['CANCELLED', 'RETURNED', 'REFUNDED']);

const STATUS_COLORS: Record<string, string> = {
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

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

const PAYMENT_LABELS: Record<string, string> = {
  PAYSTACK_CARD: 'Paystack Card',
  PAYSTACK_TRANSFER: 'Paystack Transfer',
  PAYSTACK_USSD: 'Paystack USSD',
  PAY_ON_DELIVERY: 'Pay on Delivery',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await api.get<Order>(`/admin/orders/${id}`).catch(() => null);
  if (!order) notFound();

  const currentStepIdx = STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = CANCELLED_STATUSES.has(order.status);
  const adminNotes = order.adminNotes ?? null;
  const hasReconciliationRisk = Boolean(
    adminNotes?.includes('[LATE_OR_DUPLICATE_PAYMENT]') ||
      adminNotes?.includes('[PAYMENT_AMOUNT_MISMATCH]') ||
      adminNotes?.includes('[PAYMENT_FAILED]'),
  );
  const isPaymentSuccessful =
    order.paymentMethod === 'PAY_ON_DELIVERY' ||
    order.payment?.status === 'SUCCESS' ||
    ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status);
  const whatsappPhone = order.customerPhone?.replace(/[^\d+]/g, '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-700">
              ← Orders
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString('en-NG')}
          </p>
          {hasReconciliationRisk && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Payment reconciliation required
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/orders/${order.id}/invoice`}
            target="_blank"
            className="btn-secondary text-sm"
          >
            View Invoice
          </Link>
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.payment?.status ?? null}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <CreditCard className="h-4 w-4" />
            Payment
          </div>
          <p className={`mt-2 text-sm font-semibold ${isPaymentSuccessful ? 'text-green-700' : 'text-yellow-700'}`}>
            {isPaymentSuccessful ? 'Confirmed' : 'Awaiting confirmation'}
          </p>
          <p className="mt-1 text-xs text-gray-500">{PAYMENT_LABELS[order.paymentMethod]}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <PackageCheck className="h-4 w-4" />
            Fulfillment
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-900">{order.status.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-xs text-gray-500">{order.items?.length ?? 0} line items</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Truck className="h-4 w-4" />
            Delivery
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {order.shipment?.status?.replace(/_/g, ' ') ?? order.deliveryMethod.replace(/_/g, ' ')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {(order.shippingAddress as any)?.city}, {(order.shippingAddress as any)?.state}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <MessageCircle className="h-4 w-4" />
            Customer
          </div>
          {whatsappPhone ? (
            <a
              href={`https://wa.me/${whatsappPhone.replace(/^\+/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm font-semibold text-green-700 hover:underline"
            >
              WhatsApp customer
            </a>
          ) : (
            <p className="mt-2 text-sm font-semibold text-gray-500">No phone number</p>
          )}
          <p className="mt-1 truncate text-xs text-gray-500">{order.customerEmail}</p>
        </div>
      </div>

      {/* Status stepper (hidden for terminal statuses) */}
      {!isCancelled && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            {STEPS.map((step, i) => (
              <div key={step.status} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      i < currentStepIdx
                        ? 'bg-brand-500 text-white'
                        : i === currentStepIdx
                          ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                          : 'border-2 border-gray-200 text-gray-400'
                    }`}
                  >
                    {i < currentStepIdx ? '✓' : i + 1}
                  </div>
                  <span className="mt-1 text-xs text-gray-500">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${i < currentStepIdx ? 'bg-brand-500' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Items + totals */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4 font-semibold text-gray-900">
              Items ({order.items?.length ?? 0})
            </div>
            <div className="divide-y divide-gray-100">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-3 text-sm">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-12 w-12 flex-shrink-0 rounded-lg border border-gray-100 object-contain p-1"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="text-gray-500">{item.variantLabel}</p>
                    )}
                    <p className="text-gray-400">
                      {fmt(parseFloat(String(item.unitPrice)))} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium text-gray-900">
                    {fmt(parseFloat(String(item.unitPrice)) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 px-6 py-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{fmt(parseFloat(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Shipping</span>
                <span>{fmt(parseFloat(order.shippingFee))}</span>
              </div>
              {parseFloat(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>−{fmt(parseFloat(order.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{fmt(parseFloat(order.total))}</span>
              </div>
              {parseFloat(order.taxAmount) > 0 && (
                <p className="pt-0.5 text-right text-xs text-gray-400">
                  Incl. {fmt(parseFloat(order.taxAmount))} VAT (7.5%)
                </p>
              )}
            </div>
          </div>

          {/* Admin notes */}
          {adminNotes && (
            <div className={`rounded-xl border px-5 py-4 ${
              hasReconciliationRisk
                ? 'border-red-200 bg-red-50'
                : 'border-amber-200 bg-amber-50'
            }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Admin Notes
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-amber-900">{adminNotes}</pre>
            </div>
          )}
          {order.cancelledReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                Cancellation Reason
              </p>
              <p className="text-sm text-red-900">{order.cancelledReason}</p>
            </div>
          )}
        </div>

        {/* Right: Customer / Address / Payment / Shipment */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-gray-900">Customer</h3>
            <p className="text-sm font-medium text-gray-800">{order.customerName}</p>
            <p className="text-sm text-gray-500">{order.customerEmail}</p>
            {order.customerPhone && (
              <a
                href={`tel:${order.customerPhone}`}
                className="mt-0.5 block text-sm text-brand-500 hover:underline"
              >
                {order.customerPhone}
              </a>
            )}
          </div>

          {/* Delivery address */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-gray-900">Delivery Address</h3>
            <address className="not-italic text-sm leading-relaxed text-gray-600">
              {(order.shippingAddress as any)?.firstName} {(order.shippingAddress as any)?.lastName}
              <br />
              {(order.shippingAddress as any)?.line1}
              {(order.shippingAddress as any)?.line2 && (
                <>, {(order.shippingAddress as any).line2}</>
              )}
              <br />
              {(order.shippingAddress as any)?.city},{' '}
              {(order.shippingAddress as any)?.state}
            </address>
            {(order.shippingAddress as any)?.phone && (
              <p className="mt-1 text-sm text-gray-500">
                {(order.shippingAddress as any).phone}
              </p>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-gray-900">Payment</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Method</dt>
                <dd className="text-right text-gray-900">{PAYMENT_LABELS[order.paymentMethod]}</dd>
              </div>
              {order.payment ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Reference</dt>
                    <dd className="max-w-[140px] truncate font-mono text-xs text-gray-700">
                      {order.payment.reference}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Channel</dt>
                    <dd className="capitalize text-gray-900">
                      {order.payment.channel?.replace(/_/g, ' ') ?? 'Awaiting channel'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd
                      className={
                        order.payment.status === 'SUCCESS'
                          ? 'font-medium text-green-600'
                          : order.payment.status === 'FAILED'
                            ? 'font-medium text-red-600'
                            : 'font-medium text-yellow-600'
                      }
                    >
                      {order.payment.status}
                    </dd>
                  </div>
                  {order.payment.verifiedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Verified</dt>
                      <dd className="text-gray-500">
                        {new Date(order.payment.verifiedAt).toLocaleDateString('en-NG')}
                      </dd>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  {order.paymentMethod === 'PAY_ON_DELIVERY'
                    ? 'Payment will be collected on delivery or pickup.'
                    : 'No Paystack transaction has been initialized yet.'}
                </div>
              )}
            </dl>
          </div>

          {/* Shipment */}
          {order.shipment ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 font-semibold text-gray-900">Shipment</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Carrier</dt>
                  <dd className="font-medium text-gray-900">{order.shipment.carrier}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="text-gray-900">
                    {order.shipment.status.replace(/_/g, ' ')}
                  </dd>
                </div>
                {order.shipment.trackingNumber && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tracking #</dt>
                    <dd className="font-mono text-xs text-gray-700">
                      {order.shipment.trackingNumber}
                    </dd>
                  </div>
                )}
                {order.shipment.trackingUrl && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Track</dt>
                    <dd>
                      <a
                        href={order.shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-500 hover:underline"
                      >
                        Track Package →
                      </a>
                    </dd>
                  </div>
                )}
                {order.shipment.estimatedDelivery && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Est. Delivery</dt>
                    <dd className="text-gray-900">
                      {new Date(order.shipment.estimatedDelivery).toLocaleDateString('en-NG')}
                    </dd>
                  </div>
                )}
                {order.shipment.deliveredAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Delivered</dt>
                    <dd className="text-green-600">
                      {new Date(order.shipment.deliveredAt).toLocaleDateString('en-NG')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            !['PENDING_PAYMENT', 'PAID'].includes(order.status) && (
              <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
                No tracking info added yet
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
