import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Order } from '@jotek/types';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending Payment', value: 'PENDING_PAYMENT' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Packed', value: 'PACKED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

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

const PAYMENT_LABELS: Record<string, string> = {
  PAYSTACK_CARD: 'Card',
  PAYSTACK_TRANSFER: 'Transfer',
  PAYSTACK_USSD: 'USSD',
  PAY_ON_DELIVERY: 'Pay on Delivery',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const { status = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page, limit: '20', ...(status && { status }) });
  const result = await api
    .get<{ data: Order[]; total: number; pages: number }>(`/admin/orders?${qs}`)
    .catch(() => ({ data: [], total: 0, pages: 1 }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>

      <div className="flex gap-0.5 overflow-x-auto border-b border-gray-200 pb-px">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/orders${tab.value ? `?status=${tab.value}` : ''}`}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            )}
            {result.data.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium text-brand-500 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{order.customerName}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('en-NG')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {fmt(parseFloat(order.total))}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">{result.total} orders total</p>
    </div>
  );
}
