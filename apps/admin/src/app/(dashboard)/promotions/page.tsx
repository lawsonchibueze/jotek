import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { CreateCouponButton } from '@/components/promotions/create-coupon-button';
import { CouponRowActions } from '@/components/promotions/coupon-row-actions';

export const metadata: Metadata = { title: 'Promotions' };
export const dynamic = 'force-dynamic';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  maxDiscountAmount: number | null;
  usageCount: number;
  usageLimit: number | null;
  minOrderAmount: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);

function discountLabel(coupon: Coupon) {
  if (coupon.type === 'FREE_SHIPPING') return 'Free Shipping';
  if (coupon.type === 'PERCENTAGE') {
    const base = `${coupon.value}% off`;
    return coupon.maxDiscountAmount ? `${base} (max ${fmt(coupon.maxDiscountAmount)})` : base;
  }
  return `${fmt(coupon.value)} off`;
}

export default async function PromotionsPage() {
  const result = await api
    .get<{ data: Coupon[] }>('/admin/coupons')
    .catch(() => ({ data: [] }));

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        <CreateCouponButton />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Discount</th>
              <th className="px-4 py-3 text-left">Min Order</th>
              <th className="px-4 py-3 text-right">Usage</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  No coupons yet — create one to get started
                </td>
              </tr>
            )}
            {result.data.map((coupon) => {
              const expired = coupon.expiresAt
                ? new Date(coupon.expiresAt) < now
                : false;
              const atLimit =
                coupon.usageLimit !== null &&
                coupon.usageCount >= coupon.usageLimit;

              return (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                    {coupon.code}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{discountLabel(coupon)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {coupon.minOrderAmount ? fmt(coupon.minOrderAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    <span className={atLimit ? 'text-red-500 font-medium' : ''}>
                      {coupon.usageCount}
                    </span>
                    {' / '}
                    {coupon.usageLimit ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {coupon.expiresAt ? (
                      <span className={expired ? 'text-red-500' : ''}>
                        {new Date(coupon.expiresAt).toLocaleDateString('en-NG')}
                      </span>
                    ) : (
                      'No expiry'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {expired || atLimit ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        {expired ? 'Expired' : 'Limit reached'}
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          coupon.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CouponRowActions id={coupon.id} isActive={coupon.isActive} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
