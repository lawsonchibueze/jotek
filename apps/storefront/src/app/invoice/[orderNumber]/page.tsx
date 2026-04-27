import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { authedServerFetch } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@jotek/types';
import { PrintTrigger } from './print-trigger';

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function InvoicePage({ params }: PageProps) {
  const { orderNumber } = await params;
  const order = await authedServerFetch<Order>(`/orders/${orderNumber}`).catch(() => null);
  if (!order) notFound();

  const addr = (order.shippingAddress ?? {}) as unknown as Record<string, string | undefined>;
  const customerName = [addr.firstName, addr.lastName].filter(Boolean).join(' ') || '—';
  const paid = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status);

  return (
    <div className="bg-gray-100 py-8 print:bg-white print:py-0">
      <PrintTrigger />

      {/* Controls — hidden when printing */}
      <div className="mx-auto mb-6 max-w-3xl px-4 print:hidden">
        <div className="flex items-center justify-between">
          <a href={`/order-confirmation/${order.orderNumber}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to order
          </a>
          <button id="print-btn" type="button" className="btn-primary">
            Download / Print
          </button>
        </div>
      </div>

      {/* Invoice sheet */}
      <div className="mx-auto max-w-3xl bg-white px-10 py-12 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <div className="text-2xl font-bold text-brand-500">jotek</div>
            <p className="mt-1 text-xs text-gray-500">Nigeria's Premium Electronics Store</p>
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              Jotek Limited<br />
              Lagos, Nigeria<br />
              support@jotek.ng
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900">Invoice</h1>
            <p className="mt-1 font-mono text-sm text-gray-600">{order.orderNumber}</p>
            <p className="mt-0.5 text-xs text-gray-500">Issued {formatDate(order.createdAt)}</p>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {paid ? 'PAID' : order.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Billing */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Bill To</p>
            <p className="font-medium text-gray-900">{customerName}</p>
            <p className="text-gray-600">{addr.phone ?? ''}</p>
            <p className="mt-2 text-gray-600 leading-relaxed">
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}
              <br />
              {addr.city}, {addr.state}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</p>
            <p className="text-gray-900">
              {order.paymentMethod?.replace(/_/g, ' ') ?? '—'}
            </p>
            {order.payment?.reference && (
              <p className="mt-0.5 font-mono text-xs text-gray-500">{order.payment.reference}</p>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3">
                  <div className="font-medium text-gray-900">{item.productName}</div>
                  {item.variantDescription && (
                    <div className="text-xs text-gray-500">{item.variantDescription}</div>
                  )}
                </td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">{formatPrice(item.unitPrice)}</td>
                <td className="py-3 text-right font-medium">{formatPrice(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {parseFloat(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>
              {parseFloat(order.shippingFee) === 0 ? 'Free' : formatPrice(order.shippingFee)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {parseFloat(order.taxAmount) > 0 && (
            <p className="pt-0.5 text-right text-xs text-gray-400">
              Incl. {formatPrice(order.taxAmount)} VAT (7.5%)
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          <p>Thank you for your business.</p>
          <p className="mt-1">Jotek Limited · support@jotek.ng · jotek.ng</p>
        </div>
      </div>

      {/* Global print rules */}
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
