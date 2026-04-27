import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import type { Order } from '@jotek/types';
import { PrintTrigger } from './print-trigger';

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

const fmt = (n: string | number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(typeof n === 'string' ? parseFloat(n) : n);

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-NG', {
  year: 'numeric', month: 'short', day: 'numeric',
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminInvoicePage({ params }: PageProps) {
  const { id } = await params;
  const order = await api.get<Order>(`/admin/orders/${id}`).catch(() => null);
  if (!order) notFound();

  const addr = (order.shippingAddress ?? {}) as unknown as Record<string, string | undefined>;
  const customerName = [addr.firstName, addr.lastName].filter(Boolean).join(' ') || '—';
  const paid = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status);

  return (
    <div className="-m-8 bg-gray-100 py-8 print:bg-white print:m-0 print:py-0">
      <PrintTrigger />

      <div className="mx-auto mb-6 max-w-3xl px-4 print:hidden">
        <div className="flex items-center justify-between">
          <a href={`/orders/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to order
          </a>
          <button id="print-btn" type="button" className="btn-primary">
            Download / Print
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl bg-white px-10 py-12 shadow-sm print:max-w-none print:p-0 print:shadow-none">
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
            <p className="mt-0.5 text-xs text-gray-500">Issued {fmtDate(order.createdAt)}</p>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {paid ? 'PAID' : order.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

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
            <p className="text-gray-900">{order.paymentMethod?.replace(/_/g, ' ') ?? '—'}</p>
            {order.payment?.reference && (
              <p className="mt-0.5 font-mono text-xs text-gray-500">{order.payment.reference}</p>
            )}
          </div>
        </div>

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
                <td className="py-3 text-right">{fmt(item.unitPrice)}</td>
                <td className="py-3 text-right font-medium">{fmt(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          {parseFloat(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{fmt(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>{parseFloat(order.shippingFee) === 0 ? 'Free' : fmt(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{fmt(order.total)}</span>
          </div>
          {parseFloat(order.taxAmount) > 0 && (
            <p className="pt-0.5 text-right text-xs text-gray-400">
              Incl. {fmt(order.taxAmount)} VAT (7.5%)
            </p>
          )}
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          <p>Thank you for your business.</p>
          <p className="mt-1">Jotek Limited · support@jotek.ng · jotek.ng</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          body { background: white !important; }
          /* Hide the admin sidebar/nav in print */
          aside, nav, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
